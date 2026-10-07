import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';

import {
  DEFAULT_QUERY,
  HISTORY_MODES,
  SERIES,
  hostOffers,
  windowMinutes,
} from '../utils/monitoring';
import { collectionOf } from '../utils/resources';
import { drawnRows } from '../utils/series';

import { useHostReading } from './useHostReadings';
import { useHostRow } from './useHostRow';

export const HostSeriesContext = createContext(null);

const NO_ROWS = [];

const SECOND_MS = 1000;

const EMPTY = {
  rows: NO_ROWS,
  strategy: '',
  loaded: false,
  failed: false,
  stale: false,
  window: '',
};

const NO_PROVIDER = {
  epoch: 0,
  hosts: {},
  read: () => Promise.resolve(NO_ROWS),
  ask: () => Promise.resolve(NO_ROWS),
  rewindow: () => Promise.resolve(),
  setQuery: () => undefined,
  refreshHost: () => undefined,
};

/**
 * One series of one host, `metric` naming it in `SERIES`, from the hosts
 * feature's context, so the chart, its expanded dialog and the bars that
 * draw its newest sample share one copy: the series opens from the
 * browser's store, and the agent is asked by the first caller that
 * draws it, once the host's monitoring status has answered or failed,
 * for the spans of the host's window the store lacks, before the oldest
 * held and after the newest, each `since` and `until` and, while the
 * status names a collection interval, `limit` the samples the span
 * holds at it, and between reads the series grows by the samples the
 * `monitoring` topic pushes; it is read again by the callers that draw
 * it after the event stream opened fresh or answered `reset` and on
 * `refresh`, the span after the newest held alone, a new measurement
 * right then, and never on a clock. A change of the
 * host's window reads the store first and asks the agent only for the
 * span before the oldest held that the store lacks. `rows` are the samples
 * inside the window before the newest held, every one of them, with a
 * gap row where two neighbours lie more than two live intervals apart.
 * Nothing is asked of a host whose own row does not list every token
 * the series names; `offered` says whether it does. `strategy` is the
 * agent's own word for how it answered, `realtime` of an agent that
 * keeps no history.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} metric - The series' key in `SERIES`, e.g. `cpu`
 * @returns {{ rows: Array<Object>, strategy: string, loaded: boolean, failed: boolean, offered: boolean, refresh: Function }} The series, oldest first
 */
export const useHostSeries = (id, metric) => {
  const server = useHostRow(id);
  const offered = hostOffers(server, SERIES[metric].tokens);
  const { epoch, hosts, read, ask, rewindow } = useContext(HostSeriesContext) || NO_PROVIDER;
  const status = useHostReading(id, 'monitoring-status');
  const { interval, live } = collectionOf(status.data);
  const ready = !status.offered || status.loaded;
  const query = hosts[id]?.query || DEFAULT_QUERY;
  const held = hosts[id]?.metrics?.[metric] || EMPTY;
  const { loaded, stale } = held;
  const { entity } = SERIES[metric];
  const minutes = windowMinutes(query.window);
  const wanted = offered && (!loaded || stale);
  const mode = loaded ? HISTORY_MODES.refresh : HISTORY_MODES.open;
  const rewindowed = offered && loaded && !stale && held.window !== query.window;

  useEffect(() => {
    if (wanted && ready) {
      ask({ epoch, id, metric, query, interval, mode });
    }
  }, [wanted, ready, epoch, id, metric, query, interval, mode, ask]);

  useEffect(() => {
    if (rewindowed) {
      rewindow({ epoch, id, metric, query });
    }
  }, [rewindowed, epoch, id, metric, query, rewindow]);

  const refresh = useCallback(() => {
    if (offered) {
      read({ epoch, id, metric, query, interval, mode: HISTORY_MODES.refresh });
    }
  }, [offered, read, epoch, id, metric, query, interval]);

  const rows = useMemo(
    () => (offered ? drawnRows(held.rows, { entity, minutes, liveMs: live * SECOND_MS }) : NO_ROWS),
    [offered, held.rows, entity, minutes, live]
  );

  return {
    rows,
    strategy: held.strategy,
    loaded: offered && loaded,
    failed: offered && held.failed,
    offered,
    refresh,
  };
};

/**
 * The window one host's series are read over, shared by every series
 * of the host and its machines: `setQuery` takes the members that
 * change, and the series a caller draws are read from the store over
 * the new window, the agent asked only for the span the store lacks.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {{ query: { window: string }, setQuery: Function }} The query and its writer
 */
export const useHostSeriesQuery = id => {
  const { hosts, setQuery } = useContext(HostSeriesContext) || NO_PROVIDER;
  const query = hosts[id]?.query || DEFAULT_QUERY;
  const write = useCallback(patch => setQuery(id, patch), [setQuery, id]);
  return { query, setQuery: write };
};

/**
 * The read of every series held of one host, for the page's Refresh:
 * `refresh(id)` reads the history again of every series a caller drew of
 * that host and of none that nobody drew.
 *
 * @returns {Function} `refresh(id)`
 */
export const useHostSeriesRefresh = () => {
  const { refreshHost } = useContext(HostSeriesContext) || NO_PROVIDER;
  return refreshHost;
};
