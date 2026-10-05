import PropTypes from 'prop-types';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchMachineSeries } from '../api/machineMetrics';
import { MachineSeriesContext } from '../hooks/useMachineSeries';
import { agentIdOf } from '../utils/hosts';
import { detailKey } from '../utils/machines';
import { linkOf, machineSeriesOf } from '../utils/machineSeries';
import { SERIES } from '../utils/monitoring';
import { loadRing, ringKey, saveRing } from '../utils/ring';
import { latestOf, mergeRows, ringRows, rowsOf, timeOf } from '../utils/series';

const NO_ROWS = [];

const NO_METRICS = {};

const UNCAPPED = Infinity;

const emptyFor = (signedIn, epoch) => ({ epoch, signedIn, machines: {} });

const seriesKey = ({ epoch, key, metric }) => `${epoch}|${key}|${metric}`;

const flightKey = ({ epoch, key, metric, window }) =>
  `${seriesKey({ epoch, key, metric })}|${window}`;

const withMetric = ({ state, key, metric, entry }) => ({
  ...state,
  machines: {
    ...state.machines,
    [key]: { ...(state.machines[key] || NO_METRICS), [metric]: entry },
  },
});

const hydrated =
  ({ epoch, key, metric, rows, window }) =>
  state => {
    if (state.epoch !== epoch) {
      return state;
    }
    const held = state.machines[key]?.[metric];
    const entry = held
      ? { ...held, rows, window }
      : { rows, strategy: '', loaded: false, failed: false, message: '', stale: false, window };
    return withMetric({ state, key, metric, entry });
  };

const answered =
  ({ epoch, key, metric, rows, strategy, window }) =>
  state => {
    if (state.epoch !== epoch) {
      return state;
    }
    const entry = {
      rows,
      strategy,
      loaded: true,
      failed: false,
      message: '',
      stale: false,
      window,
    };
    return withMetric({ state, key, metric, entry });
  };

const refused =
  ({ epoch, key, metric, message, window }) =>
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
      window,
    };
    return withMetric({ state, key, metric, entry });
  };

const pushed =
  ({ key, metric, rows }) =>
  state => {
    const held = state.machines[key]?.[metric];
    return held ? withMetric({ state, key, metric, entry: { ...held, rows } }) : state;
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

const flying = (flights, key) => [...flights.keys()].some(flight => flight.startsWith(`${key}|`));

const merged = ({ held, rows, entity }) =>
  ringRows(mergeRows(held, rows, { entity, limit: UNCAPPED }), entity);

const linkSeriesOf = (state, id) =>
  Object.entries(state.machines)
    .filter(([key]) => key.startsWith(detailKey(id, '')))
    .flatMap(([key, metrics]) =>
      Object.keys(metrics)
        .filter(metric => linkOf(metric))
        .map(metric => ({ key, metric, link: linkOf(metric) }))
    );

/**
 * The series the machine page's charts draw of every machine a caller
 * has drawn, behind `useMachineSeries`, each held in the browser's ring
 * keyed by host, machine and series as the host's own series are: a
 * series opens from the ring's samples at once, then is read over the
 * host's window, `since` the newest sample the ring holds or the
 * window's start while it holds none and `limit` the samples the window
 * holds at the agent's collection interval, when the first caller asks,
 * a second caller while it is in flight joining it, and the answer is
 * merged into what is held; `ask` is the read of a caller that draws,
 * which answers at once while the answer is held, so a caller whose
 * render crosses the answer asks for nothing twice, and `read` the one
 * a Refresh makes, which renews it; an agent that answers the one sample it
 * takes at the read, `realtime`, has that sample merged the same way,
 * and every sample older than the widest window is dropped as a sample
 * is written or read. A read that failed keeps the rows held and the
 * agent's message beside them. The series of a link grows between reads
 * by the `monitoring` topic's `network-sample` event, the rows of that
 * link appended to the ring of every held series of it, the rows not
 * yet held, a sample pushed while a read is in flight kept aside and merged
 * after the answer; no event carries a machine's own usage or the disk
 * I/O of its volumes, so those grow by a read alone. When the event
 * stream opens fresh or answers `reset` the held series are marked
 * stale and kept on screen, and only the callers that draw one read it
 * again, `refreshMachine` reading every series drawn of a machine again
 * on Refresh. Nothing reads on a clock. What is held in memory belongs
 * to the session: when `signedIn` changes it is dropped and read from
 * the ring again, the ring itself this browser's and kept.
 */
const MachineSeriesProvider = ({ signedIn, children }) => {
  const status = useStatus();
  const [state, setState] = useState(() => emptyFor(signedIn, 0));
  const rings = useRef(new Map());
  const hydrations = useRef(new Map());
  const flights = useRef(new Map());
  const copies = useRef(new Set());
  const early = useRef(new Map());
  const queries = useRef(new Map());

  if (state.signedIn !== signedIn) {
    setState(emptyFor(signedIn, state.epoch + 1));
  }

  const hydrate = useCallback((ring, entity) => {
    if (!hydrations.current.has(ring)) {
      hydrations.current.set(
        ring,
        loadRing(ring, entity).then(rows => {
          rings.current.set(ring, rows);
          return rows;
        })
      );
    }
    return hydrations.current.get(ring);
  }, []);

  const read = useCallback(
    ({ epoch, id, name, metric, window, interval }) => {
      const { member, entity } = machineSeriesOf(metric);
      const key = detailKey(id, name);
      const ring = ringKey(id, name, metric);
      const series = seriesKey({ epoch, key, metric });
      const flight = flightKey({ epoch, key, metric, window });
      queries.current.set(key, { window, interval });
      const held = flights.current.get(flight);
      if (held) {
        return held;
      }
      copies.current.delete(flight);
      let base = NO_ROWS;
      const request = hydrate(ring, entity)
        .then(() => {
          base = rings.current.get(ring) || NO_ROWS;
          setState(hydrated({ epoch, key, metric, rows: base, window }));
          const newest = latestOf(base);
          return fetchMachineSeries(status, id, name, metric, {
            window,
            interval,
            newest: newest ? timeOf(newest) : 0,
          });
        })
        .then(answer => {
          const parked = early.current.get(series) || NO_ROWS;
          const answeredRows = merged({ held: base, rows: rowsOf(answer, member), entity });
          const kept = merged({ held: answeredRows, rows: parked, entity });
          rings.current.set(ring, kept);
          saveRing(ring, kept, entity);
          const strategy = answer?.sampling?.strategy || '';
          copies.current.add(flight);
          setState(answered({ epoch, key, metric, rows: kept, strategy, window }));
          return answer;
        })
        .catch(error => {
          log.api.error('Error fetching machine series', {
            id,
            name,
            metric,
            error: error.message,
          });
          copies.current.add(flight);
          setState(refused({ epoch, key, metric, message: error.message, window }));
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
      const key = detailKey(args.id, args.name);
      const flight = flightKey({
        epoch: args.epoch,
        key,
        metric: args.metric,
        window: args.window,
      });
      return copies.current.has(flight) ? Promise.resolve(null) : read(args);
    },
    [read]
  );

  const staleAll = () => {
    copies.current.clear();
    setState(staled);
  };

  const refreshMachine = useCallback(
    (id, name) => {
      const key = detailKey(id, name);
      const { window, interval } = queries.current.get(key) || { window: '', interval: 0 };
      Object.keys(state.machines[key] || NO_METRICS).forEach(metric =>
        read({ epoch: state.epoch, id, name, metric, window, interval })
      );
    },
    [state, read]
  );

  const take = data => {
    const id = agentIdOf(data);
    const samples = rowsOf(data, SERIES.network.member);
    linkSeriesOf(state, id).forEach(({ key, metric, link }) => {
      const rows = samples.filter(row => row.link === link);
      if (rows.length === 0) {
        return;
      }
      const series = seriesKey({ epoch: state.epoch, key, metric });
      if (flying(flights.current, series)) {
        early.current.set(series, [...(early.current.get(series) || NO_ROWS), ...rows]);
      }
      const { entity } = machineSeriesOf(metric);
      const ring = ringKey(id, key.slice(detailKey(id, '').length), metric);
      hydrate(ring, entity).then(() => {
        const kept = merged({ held: rings.current.get(ring) || NO_ROWS, rows, entity });
        rings.current.set(ring, kept);
        saveRing(ring, kept, entity);
        setState(pushed({ key, metric, rows: kept }));
      });
    });
  };

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      staleAll();
    }
  });

  useEventStream('reset', staleAll);

  useEventStream(SERIES.network.event, take);

  const value = useMemo(
    () => ({ epoch: state.epoch, machines: state.machines, read, ask, refreshMachine }),
    [state.epoch, state.machines, read, ask, refreshMachine]
  );

  return <MachineSeriesContext.Provider value={value}>{children}</MachineSeriesContext.Provider>;
};

MachineSeriesProvider.propTypes = {
  signedIn: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

export default MachineSeriesProvider;
