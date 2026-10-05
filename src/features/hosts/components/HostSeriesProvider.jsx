import PropTypes from 'prop-types';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchSeries } from '../api/monitoring';
import { HostSeriesContext } from '../hooks/useHostSeries';
import { agentIdOf } from '../utils/hosts';
import { DEFAULT_QUERY, SERIES, historyParams } from '../utils/monitoring';
import { loadRing, ringKey, saveRing } from '../utils/ring';
import { latestOf, mergeRows, ringRows, rowsOf, timeOf } from '../utils/series';

const NO_METRICS = {};

const NO_ROWS = [];

const UNCAPPED = Infinity;

const emptyFor = (signedIn, epoch) => ({ epoch, signedIn, hosts: {} });

const seriesKey = ({ epoch, id, metric }) => `${epoch}|${id}|${metric}`;

const flightKey = ({ epoch, id, metric, query }) =>
  `${seriesKey({ epoch, id, metric })}|${query.window}`;

const hostOf = (state, id) => state.hosts[id] || { query: DEFAULT_QUERY, metrics: NO_METRICS };

const withMetric = ({ state, id, metric, entry }) => {
  const host = hostOf(state, id);
  const metrics = { ...host.metrics, [metric]: entry };
  return { ...state, hosts: { ...state.hosts, [id]: { ...host, metrics } } };
};

const hydrated =
  ({ epoch, id, metric, rows }) =>
  state => {
    if (state.epoch !== epoch) {
      return state;
    }
    const held = hostOf(state, id).metrics[metric];
    const entry = held
      ? { ...held, rows }
      : { rows, strategy: '', loaded: false, failed: false, stale: false };
    return withMetric({ state, id, metric, entry });
  };

const answered =
  ({ epoch, id, metric, rows, strategy }) =>
  state => {
    if (state.epoch !== epoch) {
      return state;
    }
    const entry = { rows, strategy, loaded: true, failed: false, stale: false };
    return withMetric({ state, id, metric, entry });
  };

const refused =
  ({ epoch, id, metric }) =>
  state => {
    if (state.epoch !== epoch) {
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

const pushed =
  ({ id, metric, rows }) =>
  state => {
    const held = hostOf(state, id).metrics[metric];
    return held ? withMetric({ state, id, metric, entry: { ...held, rows } }) : state;
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

const flying = (flights, key) => [...flights.keys()].some(flight => flight.startsWith(`${key}|`));

const forget = (copies, id) =>
  [...copies]
    .filter(flight => flight.split('|')[1] === String(id))
    .forEach(flight => copies.delete(flight));

const merged = ({ held, rows, entity }) =>
  ringRows(mergeRows(held, rows, { entity, limit: UNCAPPED }), entity);

/**
 * The series the performance charts draw of every host a caller has
 * drawn, behind `useHostSeries`, each held in the browser's ring: the
 * samples of a series are kept in IndexedDB under the origin, keyed by
 * host and series, every pushed sample appended as it lands and every
 * sample older than the widest window dropped as a sample is written or
 * read, never on a clock. A series opens from the ring's samples at
 * once, then its history is read, `since` the newest sample the ring
 * holds or the start of the host's window while it holds none and
 * `limit` the samples the window holds at the agent's collection
 * interval, when the first caller asks, a second caller while it is in
 * flight joining it, and the answer is merged into what is held; `ask`
 * is the read of a caller that draws, which answers at once while the
 * answer is held, so a caller whose render crosses the answer asks for
 * nothing twice, and `read` the one a Refresh makes, which renews it; an
 * agent that keeps no history answers the one sample it took,
 * `realtime`, and that sample is merged the same way. Between reads the
 * series grows by push: the `monitoring` topic's `cpu-sample`,
 * `memory-sample`, `network-sample`, `pool-io-sample`, `arc-sample` and
 * `disk-io-sample` events each carry the rows of one collection under
 * the member the REST route answers them in, and the rows of every host
 * are appended to its ring, the rows not yet held; a sample pushed while a
 * read of its series is in flight is kept aside and merged after the
 * answer, so none is lost between the agent's answer and its arrival.
 * When the event stream opens fresh or answers `reset`, and when a
 * person changes the host's window, the held series are marked stale
 * and kept on screen, and only the callers that draw one read it again,
 * `refreshHost` reading every series drawn of a host again on Refresh.
 * Nothing reads on a clock. What is held in memory belongs to the
 * session: when `signedIn` changes it is dropped and read from the ring
 * again, the ring itself this browser's and kept.
 */
const HostSeriesProvider = ({ signedIn, children }) => {
  const status = useStatus();
  const [state, setState] = useState(() => emptyFor(signedIn, 0));
  const rings = useRef(new Map());
  const hydrations = useRef(new Map());
  const flights = useRef(new Map());
  const copies = useRef(new Set());
  const early = useRef(new Map());
  const intervals = useRef(new Map());

  if (state.signedIn !== signedIn) {
    setState(emptyFor(signedIn, state.epoch + 1));
  }

  const hydrate = useCallback((key, entity) => {
    if (!hydrations.current.has(key)) {
      hydrations.current.set(
        key,
        loadRing(key, entity).then(rows => {
          rings.current.set(key, rows);
          return rows;
        })
      );
    }
    return hydrations.current.get(key);
  }, []);

  const append = useCallback((key, entity, rows) => {
    const kept = merged({ held: rings.current.get(key) || NO_ROWS, rows, entity });
    rings.current.set(key, kept);
    saveRing(key, kept, entity);
    return kept;
  }, []);

  const read = useCallback(
    ({ epoch, id, metric, query, interval }) => {
      const { member, entity } = SERIES[metric];
      const key = ringKey(id, metric);
      const series = seriesKey({ epoch, id, metric });
      const flight = flightKey({ epoch, id, metric, query });
      intervals.current.set(id, interval);
      const held = flights.current.get(flight);
      if (held) {
        return held;
      }
      copies.current.delete(flight);
      let base = NO_ROWS;
      const request = hydrate(key, entity)
        .then(() => {
          base = rings.current.get(key) || NO_ROWS;
          setState(hydrated({ epoch, id, metric, rows: base }));
          const newest = latestOf(base);
          return fetchSeries(
            status,
            id,
            metric,
            historyParams({
              window: query.window,
              interval,
              newest: newest ? timeOf(newest) : 0,
              now: Date.now(),
            })
          );
        })
        .then(answer => {
          const parked = early.current.get(series) || NO_ROWS;
          const answeredRows = merged({ held: base, rows: rowsOf(answer, member), entity });
          const kept = merged({ held: answeredRows, rows: parked, entity });
          rings.current.set(key, kept);
          saveRing(key, kept, entity);
          const strategy = answer?.sampling?.strategy || '';
          copies.current.add(flight);
          setState(answered({ epoch, id, metric, rows: kept, strategy }));
          return answer;
        })
        .catch(error => {
          log.api.error('Error fetching host series', { id, metric, error: error.message });
          copies.current.add(flight);
          setState(refused({ epoch, id, metric }));
          return null;
        })
        .finally(() => {
          flights.current.delete(flight);
          early.current.delete(series);
        });
      flights.current.set(flight, request);
      return request;
    },
    [status, hydrate]
  );

  const ask = useCallback(
    args => {
      const flight = flightKey({
        epoch: args.epoch,
        id: args.id,
        metric: args.metric,
        query: args.query,
      });
      return copies.current.has(flight) ? Promise.resolve(NO_ROWS) : read(args);
    },
    [read]
  );

  const setQuery = useCallback((id, patch) => {
    forget(copies.current, id);
    setState(queried(id, patch));
  }, []);

  const staleAll = () => {
    copies.current.clear();
    setState(staled);
  };

  const refreshHost = useCallback(
    id => {
      const { query, metrics } = hostOf(state, id);
      const interval = intervals.current.get(id) || 0;
      Object.keys(metrics).forEach(metric =>
        read({ epoch: state.epoch, id, metric, query, interval })
      );
    },
    [state, read]
  );

  const take = (metric, data) => {
    const { member, entity } = SERIES[metric];
    const id = agentIdOf(data);
    const rows = rowsOf(data, member);
    if (rows.length === 0) {
      return;
    }
    const series = seriesKey({ epoch: state.epoch, id, metric });
    if (flying(flights.current, series)) {
      early.current.set(series, [...(early.current.get(series) || NO_ROWS), ...rows]);
    }
    const key = ringKey(id, metric);
    hydrate(key, entity).then(() => {
      const kept = append(key, entity, rows);
      setState(pushed({ id, metric, rows: kept }));
    });
  };

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      staleAll();
    }
  });

  useEventStream('reset', staleAll);

  useEventStream(SERIES.cpu.event, data => take('cpu', data));

  useEventStream(SERIES.memory.event, data => take('memory', data));

  useEventStream(SERIES.network.event, data => take('network', data));

  useEventStream(SERIES['pool-io'].event, data => take('pool-io', data));

  useEventStream(SERIES.arc.event, data => take('arc', data));

  useEventStream(SERIES['disk-io'].event, data => take('disk-io', data));

  const value = useMemo(
    () => ({ epoch: state.epoch, hosts: state.hosts, read, ask, setQuery, refreshHost }),
    [state.epoch, state.hosts, read, ask, setQuery, refreshHost]
  );

  return <HostSeriesContext.Provider value={value}>{children}</HostSeriesContext.Provider>;
};

HostSeriesProvider.propTypes = {
  signedIn: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

export default HostSeriesProvider;
