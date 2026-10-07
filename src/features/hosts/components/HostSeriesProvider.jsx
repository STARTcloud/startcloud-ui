import PropTypes from 'prop-types';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchSeries } from '../api/monitoring';
import { add, addMany, newest, oldest, range, trim } from '../charts/store';
import { HostSeriesContext } from '../hooks/useHostSeries';
import { agentIdOf } from '../utils/hosts';
import {
  DEFAULT_QUERY,
  HISTORY_MODES,
  SERIES,
  historyParams,
  historySpans,
  windowMinutes,
  windowMs,
} from '../utils/monitoring';
import { ringKey } from '../utils/ring';
import { KEPT_MS, mergeRows, rowsOf, windowOf } from '../utils/series';

const NO_METRICS = {};

const NO_ROWS = [];

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
  ({ epoch, id, metric, rows, window }) =>
  state => {
    if (state.epoch !== epoch) {
      return state;
    }
    const held = hostOf(state, id).metrics[metric];
    const entry = held
      ? { ...held, rows, window }
      : { rows, strategy: '', loaded: false, failed: false, stale: false, window };
    return withMetric({ state, id, metric, entry });
  };

const answered =
  ({ epoch, id, metric, rows, strategy, window }) =>
  state => {
    if (state.epoch !== epoch) {
      return state;
    }
    const entry = { rows, strategy, loaded: true, failed: false, stale: false, window };
    return withMetric({ state, id, metric, entry });
  };

const refused =
  ({ epoch, id, metric, window }) =>
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
      window,
    };
    return withMetric({ state, id, metric, entry });
  };

const windowed =
  ({ epoch, id, metric, rows, window }) =>
  state => {
    const held = hostOf(state, id).metrics[metric];
    return state.epoch === epoch && held
      ? withMetric({ state, id, metric, entry: { ...held, rows, window } })
      : state;
  };

const pushed =
  ({ id, metric, rows, entity }) =>
  state => {
    const held = hostOf(state, id).metrics[metric];
    if (!held) {
      return state;
    }
    const minutes = windowMinutes(held.window);
    const kept = windowOf(mergeRows(held.rows, rows, { entity }), { entity, minutes });
    return withMetric({ state, id, metric, entry: { ...held, rows: kept } });
  };

const staleMetrics = metrics =>
  Object.fromEntries(
    Object.entries(metrics).map(([metric, entry]) => [metric, { ...entry, stale: true }])
  );

const staled = state => {
  const hosts = Object.entries(state.hosts).map(([id, host]) => [
    id,
    { ...host, metrics: staleMetrics(host.metrics) },
  ]);
  return { ...state, hosts: Object.fromEntries(hosts) };
};

const queried = (id, patch) => state => {
  const host = hostOf(state, id);
  const query = { ...host.query, ...patch };
  return { ...state, hosts: { ...state.hosts, [id]: { ...host, query } } };
};

const opened = async (key, window) => {
  const [first, last] = await Promise.all([oldest(key), newest(key)]);
  const now = Date.now();
  const end = last ?? now;
  const start = end - windowMs(window);
  const rows = last === null ? NO_ROWS : await range(key, start, end);
  return { rows, oldest: first, newest: last, start, now };
};

const filled = async ({ key, entity, member, answers, window }) => {
  await Promise.all(answers.map(answer => addMany(key, rowsOf(answer, member), entity)));
  await trim(key, KEPT_MS);
  return opened(key, window);
};

const strategyOf = answers => answers.at(-1)?.sampling?.strategy || '';

/**
 * The series the performance charts draw of every host a caller has
 * drawn, behind `useHostSeries`, each held in the browser's store of
 * samples: one record a sample in IndexedDB under the origin, keyed by
 * host, series, instant and entity, every pushed sample appended as it
 * lands and every sample older than the widest window deleted after
 * each write, measured from the newest sample held and never from a
 * clock. A series opens from the store's samples over the host's
 * window at once, then the agent is asked for the spans the store
 * lacks and no other, by `historySpans` and the read's `mode`: the whole
 * window while it holds nothing; on `open`, the span from the window's
 * start to the oldest held sample while that sample is newer than the
 * start, and the span from the newest held sample to now; on `refresh`,
 * the span from the newest held to now alone, a new measurement right
 * then; each `since` and `until` as RFC 3339 and, while the agent's
 * collection interval is known, `limit` the samples the span holds at
 * it, when the first caller asks, a second caller while it is in flight
 * joining it; each answer is written in one transaction, a duplicate
 * instant one record and every pushed sample inside the span answered
 * dropped, and the window is read from the store again. `ask` is the read of a
 * caller that draws, which answers at once while the answer is held, so
 * a caller whose render crosses the answer asks for nothing twice, and
 * `read` the one a Refresh makes, which renews it; an agent that keeps
 * no history answers the one sample it took, `realtime`, and that
 * sample is written the same way. Between reads the series grows by
 * push: the `monitoring` topic's `cpu-sample`, `memory-sample`,
 * `network-sample`, `pool-io-sample`, `arc-sample` and `disk-io-sample`
 * events each carry the rows of one collection under the member the
 * REST route answers them in, and every row of every host is appended
 * to the store, one record each, the rows kept joining the held series
 * inside its window. When the event stream opens fresh or answers
 * `reset` the held series are marked stale and kept on screen, and only
 * the callers that draw one read it again, `refreshHost` reading every
 * series drawn of a host again on Refresh; when a person changes the
 * host's window, `rewindow` reads the store over the new window first
 * and asks the agent only for the span before the oldest held sample
 * that the window reaches and the store lacks, every caller that draws
 * the series joining the one read in flight. Nothing reads on a
 * clock. What is held in
 * memory belongs to the session: when `signedIn` changes it is dropped
 * and read from the store again, the store itself this browser's and
 * kept.
 */
const HostSeriesProvider = ({ signedIn, children }) => {
  const status = useStatus();
  const [state, setState] = useState(() => emptyFor(signedIn, 0));
  const flights = useRef(new Map());
  const rewindows = useRef(new Map());
  const copies = useRef(new Set());
  const intervals = useRef(new Map());

  if (state.signedIn !== signedIn) {
    setState(emptyFor(signedIn, state.epoch + 1));
  }

  const read = useCallback(
    ({ epoch, id, metric, query, interval, mode = HISTORY_MODES.refresh }) => {
      const { member, entity } = SERIES[metric];
      const key = ringKey(id, metric);
      const { window } = query;
      const flight = flightKey({ epoch, id, metric, query });
      intervals.current.set(id, interval);
      const held = flights.current.get(flight);
      if (held) {
        return held;
      }
      copies.current.delete(flight);
      const fetchSpan = span =>
        fetchSeries(status, id, metric, historyParams({ ...span, interval }));
      const request = opened(key, window)
        .then(base => {
          setState(hydrated({ epoch, id, metric, rows: base.rows, window }));
          return Promise.all(historySpans({ ...base, mode }).map(fetchSpan));
        })
        .then(answers =>
          filled({ key, entity, member, answers, window }).then(({ rows }) => {
            copies.current.add(flight);
            setState(answered({ epoch, id, metric, rows, strategy: strategyOf(answers), window }));
            return answers.at(-1);
          })
        )
        .catch(error => {
          log.api.error('Error fetching host series', { id, metric, error: error.message });
          copies.current.add(flight);
          setState(refused({ epoch, id, metric, window }));
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

  const rewindow = useCallback(
    ({ epoch, id, metric, query }) => {
      const { member, entity } = SERIES[metric];
      const key = ringKey(id, metric);
      const { window } = query;
      const flight = flightKey({ epoch, id, metric, query });
      const held = rewindows.current.get(flight);
      if (held) {
        return held;
      }
      const interval = intervals.current.get(id) || 0;
      const fetchSpan = span =>
        fetchSeries(status, id, metric, historyParams({ ...span, interval }));
      const request = opened(key, window)
        .then(base => {
          setState(windowed({ epoch, id, metric, rows: base.rows, window }));
          const spans = historySpans({ ...base, mode: HISTORY_MODES.rewindow });
          if (spans.length === 0) {
            return base;
          }
          return Promise.all(spans.map(fetchSpan)).then(answers =>
            filled({ key, entity, member, answers, window })
          );
        })
        .then(({ rows }) => {
          setState(windowed({ epoch, id, metric, rows, window }));
        })
        .catch(error => {
          log.api.error('Error filling host series', { id, metric, error: error.message });
        })
        .finally(() => {
          rewindows.current.delete(flight);
        });
      rewindows.current.set(flight, request);
      return request;
    },
    [status]
  );

  const setQuery = useCallback((id, patch) => {
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
    const key = ringKey(id, metric);
    Promise.all(rows.map(row => add(key, row, entity))).then(kept => {
      const added = kept.flatMap((wasKept, index) => (wasKept ? [rows[index]] : []));
      if (added.length > 0) {
        trim(key, KEPT_MS);
        setState(pushed({ id, metric, rows: added, entity }));
      }
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
    () => ({
      epoch: state.epoch,
      hosts: state.hosts,
      read,
      ask,
      rewindow,
      setQuery,
      refreshHost,
    }),
    [state.epoch, state.hosts, read, ask, rewindow, setQuery, refreshHost]
  );

  return <HostSeriesContext.Provider value={value}>{children}</HostSeriesContext.Provider>;
};

HostSeriesProvider.propTypes = {
  signedIn: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

export default HostSeriesProvider;
