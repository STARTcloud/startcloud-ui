import PropTypes from 'prop-types';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchSeries } from '../api/monitoring';
import { HostSeriesContext } from '../hooks/useHostSeries';
import { agentIdOf } from '../utils/hosts';
import { DEFAULT_QUERY, SERIES, historyParams } from '../utils/monitoring';
import { mergeRows, rowsOf } from '../utils/series';

const REALTIME = 'realtime';

const NO_METRICS = {};

const NO_ROWS = [];

const emptyFor = (signedIn, epoch) => ({ epoch, signedIn, hosts: {} });

const queryKey = query => `${query.window}|${query.resolution}`;

const seriesKey = ({ epoch, id, metric }) => `${epoch}|${id}|${metric}`;

const flightKey = ({ epoch, id, metric, query }) =>
  `${seriesKey({ epoch, id, metric })}|${queryKey(query)}`;

const hostOf = (state, id) => state.hosts[id] || { query: DEFAULT_QUERY, metrics: NO_METRICS };

const withMetric = ({ state, id, metric, entry }) => {
  const host = hostOf(state, id);
  const metrics = { ...host.metrics, [metric]: entry };
  return { ...state, hosts: { ...state.hosts, [id]: { ...host, metrics } } };
};

const stillAsked = ({ state, epoch, id, query }) =>
  state.epoch === epoch && queryKey(hostOf(state, id).query) === queryKey(query);

const mergedRows = ({ held, answer, metric, strategy, early }) => {
  const { member, entity } = SERIES[metric];
  const read = rowsOf(answer, member);
  const kept = held ? held.rows : NO_ROWS;
  const rows =
    strategy === REALTIME
      ? mergeRows(kept, read, { entity })
      : mergeRows(mergeRows(NO_ROWS, read, { entity }), kept, { entity });
  return mergeRows(rows, early, { entity });
};

const answered =
  ({ epoch, id, metric, query, answer, early }) =>
  state => {
    if (!stillAsked({ state, epoch, id, query })) {
      return state;
    }
    const held = hostOf(state, id).metrics[metric];
    const strategy = answer?.sampling?.strategy || '';
    const rows = mergedRows({ held, answer, metric, strategy, early });
    const entry = { rows, strategy, loaded: true, failed: false, stale: false };
    return withMetric({ state, id, metric, entry });
  };

const refused =
  ({ epoch, id, metric, query }) =>
  state => {
    if (!stillAsked({ state, epoch, id, query })) {
      return state;
    }
    const held = hostOf(state, id).metrics[metric];
    const entry = {
      rows: held ? held.rows : NO_ROWS,
      strategy: held ? held.strategy : '',
      loaded: true,
      failed: true,
      stale: false,
    };
    return withMetric({ state, id, metric, entry });
  };

const staleMetrics = metrics =>
  Object.fromEntries(
    Object.entries(metrics).map(([metric, entry]) => [metric, { ...entry, stale: true }])
  );

const staleHost = host => ({ ...host, metrics: staleMetrics(host.metrics) });

const staled = state => {
  const hosts = Object.entries(state.hosts).map(([id, host]) => [id, staleHost(host)]);
  return { ...state, hosts: Object.fromEntries(hosts) };
};

const queried = (id, patch) => state => {
  const host = staleHost(hostOf(state, id));
  const query = { ...host.query, ...patch };
  return { ...state, hosts: { ...state.hosts, [id]: { ...host, query } } };
};

const pushed = (metric, data) => state => {
  const id = agentIdOf(data);
  const held = hostOf(state, id).metrics[metric];
  if (!held?.loaded) {
    return state;
  }
  const { member, entity } = SERIES[metric];
  const rows = mergeRows(held.rows, rowsOf(data, member), { entity });
  return withMetric({ state, id, metric, entry: { ...held, rows } });
};

const flying = (flights, key) => [...flights.keys()].some(flight => flight.startsWith(`${key}|`));

/**
 * The series the performance charts draw of every host a caller has
 * drawn, behind `useHostSeries`: the history of a series is read once,
 * `since` the start of the host's window and `limit` the samples of its
 * resolution, when the first caller asks, a second caller while it is in
 * flight joining it; an agent that keeps a history answers it and the
 * rows held are replaced by it, the held rows newer than its newest
 * kept, an agent that keeps none answers the one sample it took,
 * `realtime`, and that sample is added to the rows held. Between reads
 * the series grows by push: the `monitoring` topic's `cpu-sample`,
 * `memory-sample`, `network-sample`, `pool-io-sample` and `arc-sample`
 * events each carry the rows of one collection under the member the REST
 * route answers them in, and the rows of a host whose series is held are
 * merged in, newer rows alone, 180 kept of each entity, hyperweaver-ui's
 * number; a sample pushed while the first read of its series is in
 * flight is kept aside and merged into the answer, so none is lost
 * between the agent's answer and its arrival. When the event stream
 * opens fresh or answers `reset`, and when a person changes the host's
 * window or resolution, the held series are marked stale and kept on
 * screen, and only the callers that draw one read it again. Nothing
 * reads on a clock. The series belong to the session: when `signedIn`
 * changes they are dropped, an answer of the session before it
 * discarded.
 */
const HostSeriesProvider = ({ signedIn, children }) => {
  const status = useStatus();
  const [state, setState] = useState(() => emptyFor(signedIn, 0));
  const flights = useRef(null);
  const early = useRef(null);

  if (state.signedIn !== signedIn) {
    setState(emptyFor(signedIn, state.epoch + 1));
  }

  const read = useCallback(
    ({ epoch, id, metric, query }) => {
      flights.current ||= new Map();
      early.current ||= new Map();
      const key = flightKey({ epoch, id, metric, query });
      const series = seriesKey({ epoch, id, metric });
      const held = flights.current.get(key);
      if (held) {
        return held;
      }
      const flight = fetchSeries(status, id, metric, historyParams(query, Date.now()))
        .then(answer => {
          const rows = early.current.get(series) || NO_ROWS;
          setState(answered({ epoch, id, metric, query, answer, early: rows }));
          return answer;
        })
        .catch(error => {
          log.api.error('Error fetching host series', { id, metric, error: error.message });
          setState(refused({ epoch, id, metric, query }));
          return null;
        })
        .finally(() => {
          flights.current.delete(key);
          early.current.delete(series);
        });
      flights.current.set(key, flight);
      return flight;
    },
    [status]
  );

  const setQuery = useCallback((id, patch) => setState(queried(id, patch)), []);

  const take = (metric, data) => {
    const series = seriesKey({ epoch: state.epoch, id: agentIdOf(data), metric });
    if (flights.current && flying(flights.current, series)) {
      const rows = early.current.get(series) || NO_ROWS;
      early.current.set(series, [...rows, ...rowsOf(data, SERIES[metric].member)]);
    }
    setState(pushed(metric, data));
  };

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      setState(staled);
    }
  });

  useEventStream('reset', () => setState(staled));

  useEventStream(SERIES.cpu.event, data => take('cpu', data));

  useEventStream(SERIES.memory.event, data => take('memory', data));

  useEventStream(SERIES.network.event, data => take('network', data));

  useEventStream(SERIES['pool-io'].event, data => take('pool-io', data));

  useEventStream(SERIES.arc.event, data => take('arc', data));

  useEventStream(SERIES['disk-io'].event, data => take('disk-io', data));

  const value = useMemo(
    () => ({ epoch: state.epoch, hosts: state.hosts, read, setQuery }),
    [state.epoch, state.hosts, read, setQuery]
  );

  return <HostSeriesContext.Provider value={value}>{children}</HostSeriesContext.Provider>;
};

HostSeriesProvider.propTypes = {
  signedIn: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

export default HostSeriesProvider;
