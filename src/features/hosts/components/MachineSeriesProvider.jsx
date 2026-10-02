import PropTypes from 'prop-types';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchMachineSeries } from '../api/machineMetrics';
import { MachineSeriesContext } from '../hooks/useMachineSeries';
import { agentIdOf } from '../utils/hosts';
import { detailKey } from '../utils/machines';
import { linkOf, machineSeriesOf, windowOf } from '../utils/machineSeries';
import { SERIES } from '../utils/monitoring';
import { mergeRows, rowsOf } from '../utils/series';

const REALTIME = 'realtime';

const NO_ROWS = [];

const NO_METRICS = {};

const emptyFor = (signedIn, epoch) => ({ epoch, signedIn, machines: {} });

const flightKey = ({ epoch, key, metric }) => `${epoch}|${key}|${metric}`;

const mergeOf = metric => ({ entity: machineSeriesOf(metric).entity, limit: Infinity });

const mergedInto = (held, rows, metric) =>
  windowOf(mergeRows(held, rows, mergeOf(metric)), machineSeriesOf(metric).entity);

const withMetric = ({ state, key, metric, entry }) => ({
  ...state,
  machines: {
    ...state.machines,
    [key]: { ...(state.machines[key] || NO_METRICS), [metric]: entry },
  },
});

const mergedRows = ({ held, answer, metric, strategy }) => {
  const read = rowsOf(answer, machineSeriesOf(metric).member);
  const kept = held ? held.rows : NO_ROWS;
  return strategy === REALTIME
    ? mergedInto(kept, read, metric)
    : mergedInto(mergedInto(NO_ROWS, read, metric), kept, metric);
};

const answered =
  ({ epoch, key, metric, answer }) =>
  state => {
    if (state.epoch !== epoch) {
      return state;
    }
    const held = state.machines[key]?.[metric];
    const strategy = answer?.sampling?.strategy || '';
    const rows = mergedRows({ held, answer, metric, strategy });
    const entry = { rows, strategy, loaded: true, failed: false, message: '', stale: false };
    return withMetric({ state, key, metric, entry });
  };

const refused =
  ({ epoch, key, metric, message }) =>
  state => {
    if (state.epoch !== epoch) {
      return state;
    }
    const held = state.machines[key]?.[metric];
    const entry = {
      rows: held ? held.rows : NO_ROWS,
      strategy: held ? held.strategy : '',
      loaded: true,
      failed: true,
      message,
      stale: false,
    };
    return withMetric({ state, key, metric, entry });
  };

const staleMetrics = metrics =>
  Object.fromEntries(
    Object.entries(metrics).map(([metric, entry]) => [metric, { ...entry, stale: true }])
  );

const staled = state => ({
  ...state,
  machines: Object.fromEntries(
    Object.entries(state.machines).map(([key, metrics]) => [key, staleMetrics(metrics)])
  ),
});

const pushedInto = (metrics, samples) =>
  Object.fromEntries(
    Object.entries(metrics).map(([metric, entry]) => {
      const link = linkOf(metric);
      const rows = link && entry.loaded ? samples.filter(row => row.link === link) : NO_ROWS;
      return [
        metric,
        rows.length > 0 ? { ...entry, rows: mergedInto(entry.rows, rows, metric) } : entry,
      ];
    })
  );

const pushed = data => state => {
  const prefix = detailKey(agentIdOf(data), '');
  const samples = rowsOf(data, SERIES.network.member);
  if (samples.length === 0 || !Object.keys(state.machines).some(key => key.startsWith(prefix))) {
    return state;
  }
  return {
    ...state,
    machines: Object.fromEntries(
      Object.entries(state.machines).map(([key, metrics]) => [
        key,
        key.startsWith(prefix) ? pushedInto(metrics, samples) : metrics,
      ])
    ),
  };
};

/**
 * The series the machine page's charts draw of every machine a caller
 * has drawn, behind `useMachineSeries`: a series is read once when the
 * first caller asks, a second caller while it is in flight joining it;
 * an agent that keeps a history answers the last fifteen minutes and the
 * rows held are replaced by them, the held rows newer than its newest
 * kept, an agent that answers the one sample it takes at the read,
 * `realtime`, has that sample added to the rows held, and of each entity
 * the rows of the fifteen minutes before its newest are kept, the
 * window rolling as the series grows. A read that failed keeps the rows
 * held and the agent's message beside them. The series of a link grows between reads by the `monitoring`
 * topic's `network-sample` event, the rows of that link merged into the
 * series held of the host's machines, newer rows alone; no event carries
 * a machine's own usage or the disk I/O of its volumes, so those grow by
 * a read alone. When the event stream opens fresh or answers `reset` the
 * held series are marked stale and kept on screen, and only the callers
 * that draw one read it again. Nothing reads on a clock,
 * hyperweaver-ui's thirty-second read of each chart not carried over.
 * The series belong to the session: when `signedIn` changes they are
 * dropped, an answer of the session before it discarded.
 */
const MachineSeriesProvider = ({ signedIn, children }) => {
  const status = useStatus();
  const [state, setState] = useState(() => emptyFor(signedIn, 0));
  const flights = useRef(null);

  if (state.signedIn !== signedIn) {
    setState(emptyFor(signedIn, state.epoch + 1));
  }

  const read = useCallback(
    ({ epoch, id, name, metric }) => {
      flights.current ||= new Map();
      const key = detailKey(id, name);
      const flying = flights.current.get(flightKey({ epoch, key, metric }));
      if (flying) {
        return flying;
      }
      const flight = fetchMachineSeries(status, id, name, metric)
        .then(answer => {
          setState(answered({ epoch, key, metric, answer }));
          return answer;
        })
        .catch(error => {
          log.api.error('Error fetching machine series', {
            id,
            name,
            metric,
            error: error.message,
          });
          setState(refused({ epoch, key, metric, message: error.message }));
          return null;
        })
        .finally(() => flights.current.delete(flightKey({ epoch, key, metric })));
      flights.current.set(flightKey({ epoch, key, metric }), flight);
      return flight;
    },
    [status]
  );

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      setState(staled);
    }
  });

  useEventStream('reset', () => setState(staled));

  useEventStream(SERIES.network.event, data => setState(pushed(data)));

  const value = useMemo(
    () => ({ epoch: state.epoch, machines: state.machines, read }),
    [state.epoch, state.machines, read]
  );

  return <MachineSeriesContext.Provider value={value}>{children}</MachineSeriesContext.Provider>;
};

MachineSeriesProvider.propTypes = {
  signedIn: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

export default MachineSeriesProvider;
