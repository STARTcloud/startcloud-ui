import PropTypes from 'prop-types';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchMachineSeries } from '../api/machineMetrics';
import { add, addMany, newest, oldest, range, trim } from '../charts/store';
import { MachineSeriesContext } from '../hooks/useMachineSeries';
import { agentIdOf } from '../utils/hosts';
import { detailKey } from '../utils/machines';
import { linkOf, machineSeriesOf } from '../utils/machineSeries';
import { HISTORY_MODES, SERIES, historySpans, windowMinutes, windowMs } from '../utils/monitoring';
import { ringKey } from '../utils/ring';
import { KEPT_MS, mergeRows, rowsOf, windowOf } from '../utils/series';

const NO_ROWS = [];

const NO_METRICS = {};

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

const windowed =
  ({ epoch, key, metric, rows, window }) =>
  state => {
    const held = state.machines[key]?.[metric];
    return state.epoch === epoch && held
      ? withMetric({ state, key, metric, entry: { ...held, rows, window } })
      : state;
  };

const pushed =
  ({ key, metric, rows, entity }) =>
  state => {
    const held = state.machines[key]?.[metric];
    if (!held) {
      return state;
    }
    const minutes = windowMinutes(held.window);
    const kept = windowOf(mergeRows(held.rows, rows, { entity }), { entity, minutes });
    return withMetric({ state, key, metric, entry: { ...held, rows: kept } });
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

const linkSeriesOf = (state, id) =>
  Object.entries(state.machines)
    .filter(([key]) => key.startsWith(detailKey(id, '')))
    .flatMap(([key, metrics]) =>
      Object.keys(metrics)
        .filter(metric => linkOf(metric))
        .map(metric => ({ key, metric, link: linkOf(metric) }))
    );

const opened = async (ring, window) => {
  const [first, last] = await Promise.all([oldest(ring), newest(ring)]);
  const now = Date.now();
  const end = last ?? now;
  const start = end - windowMs(window);
  const rows = last === null ? NO_ROWS : await range(ring, start, end);
  return { rows, oldest: first, newest: last, start, now };
};

const filled = async ({ ring, entity, member, answers, window }) => {
  await Promise.all(answers.map(answer => addMany(ring, rowsOf(answer, member), entity)));
  await trim(ring, KEPT_MS);
  return opened(ring, window);
};

const strategyOf = answers => answers.at(-1)?.sampling?.strategy || '';

const spansOf = (metric, base, mode) => {
  if (machineSeriesOf(metric).windowed) {
    return historySpans({ ...base, mode });
  }
  return mode === HISTORY_MODES.rewindow ? [] : [{ since: base.now, until: base.now }];
};

/**
 * The series the machine page's charts draw of every machine a caller
 * has drawn, behind `useMachineSeries`, each held in the browser's store
 * of samples keyed by host, machine and series as the host's own series
 * are, one record a sample: a series opens from the store's samples
 * over the host's window at once, then the agent is asked for the spans
 * the store lacks and no other, by `historySpans` and the read's
 * `mode`: the whole window while it holds nothing; on `open`, the span
 * from the window's start to the oldest held sample while that sample
 * is newer than the start, and the span from the newest held sample to
 * now; on `refresh`, the span from the newest held to now alone; a
 * series not read over the window, a VirtualBox machine's usage, one
 * request on open and on refresh and none on a window change; each
 * `since` and `until` as RFC 3339 and, while the agent's collection
 * interval is known, `limit` the samples the span holds at it, when the
 * first caller asks, a second caller while it is in flight joining it;
 * each answer is written in one
 * transaction, a duplicate instant one record and every pushed sample
 * inside the span answered dropped, every sample older than the widest
 * window deleted after each write, and the window is read from the
 * store again. `ask` is the read
 * of a caller that draws, which answers at once while the answer is
 * held, so a caller whose render crosses the answer asks for nothing
 * twice, and `read` the one a Refresh makes, which renews it; an agent
 * that answers the one sample it takes at the read, `realtime`, has that
 * sample written the same way. A read that failed keeps the rows held
 * and the agent's message beside them. The series of a link grows
 * between reads by the `monitoring` topic's `network-sample` event, the
 * rows of that link appended to the store of every held series of it,
 * one record each; no event carries a machine's own usage or the disk
 * I/O of its volumes, so those grow by a read alone. When the event
 * stream opens fresh or answers `reset` the held series are marked
 * stale and kept on screen, and only the callers that draw one read it
 * again, `refreshMachine` reading every series drawn of a machine again
 * on Refresh; when the host's window changes, `rewindow` reads the store
 * over the new window first and asks the agent only for the span before
 * the oldest held sample that the window reaches and the store lacks,
 * every caller that draws the series joining the one read in flight.
 * Nothing reads on a clock. What is held in memory belongs to the
 * session: when
 * `signedIn` changes it is dropped and read from the store again, the
 * store itself this browser's and kept.
 */
const MachineSeriesProvider = ({ signedIn, children }) => {
  const status = useStatus();
  const [state, setState] = useState(() => emptyFor(signedIn, 0));
  const flights = useRef(new Map());
  const rewindows = useRef(new Map());
  const copies = useRef(new Set());
  const queries = useRef(new Map());

  if (state.signedIn !== signedIn) {
    setState(emptyFor(signedIn, state.epoch + 1));
  }

  const read = useCallback(
    ({ epoch, id, name, metric, window, interval, mode = HISTORY_MODES.refresh }) => {
      const { member, entity } = machineSeriesOf(metric);
      const key = detailKey(id, name);
      const ring = ringKey(id, name, metric);
      const flight = flightKey({ epoch, key, metric, window });
      queries.current.set(key, { window, interval });
      const held = flights.current.get(flight);
      if (held) {
        return held;
      }
      copies.current.delete(flight);
      const fetchSpan = span => fetchMachineSeries(status, id, name, metric, { ...span, interval });
      const request = opened(ring, window)
        .then(base => {
          setState(hydrated({ epoch, key, metric, rows: base.rows, window }));
          return Promise.all(spansOf(metric, base, mode).map(fetchSpan));
        })
        .then(answers =>
          filled({ ring, entity, member, answers, window }).then(({ rows }) => {
            copies.current.add(flight);
            setState(answered({ epoch, key, metric, rows, strategy: strategyOf(answers), window }));
            return answers.at(-1);
          })
        )
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
        });
      flights.current.set(flight, request);
      return request;
    },
    [status]
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

  const rewindow = useCallback(
    ({ epoch, id, name, metric, window }) => {
      const { member, entity } = machineSeriesOf(metric);
      const key = detailKey(id, name);
      const ring = ringKey(id, name, metric);
      const flight = flightKey({ epoch, key, metric, window });
      const held = rewindows.current.get(flight);
      if (held) {
        return held;
      }
      const { interval } = queries.current.get(key) || { interval: 0 };
      const fetchSpan = span => fetchMachineSeries(status, id, name, metric, { ...span, interval });
      const request = opened(ring, window)
        .then(base => {
          setState(windowed({ epoch, key, metric, rows: base.rows, window }));
          const spans = spansOf(metric, base, HISTORY_MODES.rewindow);
          if (spans.length === 0) {
            return base;
          }
          return Promise.all(spans.map(fetchSpan)).then(answers =>
            filled({ ring, entity, member, answers, window })
          );
        })
        .then(({ rows }) => {
          setState(windowed({ epoch, key, metric, rows, window }));
        })
        .catch(error => {
          log.api.error('Error filling machine series', {
            id,
            name,
            metric,
            error: error.message,
          });
        })
        .finally(() => {
          rewindows.current.delete(flight);
        });
      rewindows.current.set(flight, request);
      return request;
    },
    [status]
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
      const { entity } = machineSeriesOf(metric);
      const ring = ringKey(id, key.slice(detailKey(id, '').length), metric);
      Promise.all(rows.map(row => add(ring, row, entity))).then(kept => {
        const added = kept.flatMap((wasKept, index) => (wasKept ? [rows[index]] : []));
        if (added.length > 0) {
          trim(ring, KEPT_MS);
          setState(pushed({ key, metric, rows: added, entity }));
        }
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
    () => ({
      epoch: state.epoch,
      machines: state.machines,
      read,
      ask,
      rewindow,
      refreshMachine,
    }),
    [state.epoch, state.machines, read, ask, rewindow, refreshMachine]
  );

  return <MachineSeriesContext.Provider value={value}>{children}</MachineSeriesContext.Provider>;
};

MachineSeriesProvider.propTypes = {
  signedIn: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

export default MachineSeriesProvider;
