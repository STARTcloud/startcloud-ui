import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';

import { DEFAULT_QUERY, SERIES, hostOffers, windowMinutes } from '../utils/monitoring';
import { collectionOf } from '../utils/resources';
import { drawnRows } from '../utils/series';

import { useHostReading } from './useHostReadings';
import { useHostRow } from './useHostRow';

export const HostSeriesContext = createContext(null);

const NO_ROWS = [];

const EMPTY = { rows: NO_ROWS, strategy: '', loaded: false, failed: false, stale: false };

const NO_PROVIDER = {
  epoch: 0,
  hosts: {},
  read: () => Promise.resolve(NO_ROWS),
  ask: () => Promise.resolve(NO_ROWS),
  setQuery: () => undefined,
  refreshHost: () => undefined,
};

/**
 * One series of one host, `metric` naming it in `SERIES`, from the hosts
 * feature's context, so the chart, its expanded dialog and the bars that
 * draw its newest sample share one copy: the series opens from the
 * browser's ring, its history is read once by the first caller that
 * draws it, `since` the newest sample held or the start of the host's
 * window and `limit` the samples the window holds at the agent's
 * collection interval, the interval read from the host's monitoring
 * status, and between reads the series grows by the samples the
 * `monitoring` topic pushes; it is read again by the callers that draw
 * it after the event stream opened fresh or answered `reset`, after the
 * window changed, and on `refresh`, and never on a clock. `rows` are the
 * samples inside the window before the newest held, the 180 newest of
 * each entity. Nothing is asked of a host whose own row does not list
 * every token the series names; `offered` says whether it does.
 * `strategy` is the agent's own word for how it answered, `realtime` of
 * an agent that keeps no history.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} metric - The series' key in `SERIES`, e.g. `cpu`
 * @returns {{ rows: Array<Object>, strategy: string, loaded: boolean, failed: boolean, offered: boolean, refresh: Function }} The series, oldest first
 */
export const useHostSeries = (id, metric) => {
  const server = useHostRow(id);
  const offered = hostOffers(server, SERIES[metric].tokens);
  const { epoch, hosts, read, ask } = useContext(HostSeriesContext) || NO_PROVIDER;
  const status = useHostReading(id, 'monitoring-status');
  const { interval } = collectionOf(status.data);
  const query = hosts[id]?.query || DEFAULT_QUERY;
  const held = hosts[id]?.metrics?.[metric] || EMPTY;
  const { loaded, stale } = held;
  const { entity } = SERIES[metric];
  const minutes = windowMinutes(query.window);

  useEffect(() => {
    if (offered && (!loaded || stale)) {
      ask({ epoch, id, metric, query, interval });
    }
  }, [offered, loaded, stale, epoch, id, metric, query, interval, ask]);

  const refresh = useCallback(() => {
    if (offered) {
      read({ epoch, id, metric, query, interval });
    }
  }, [offered, read, epoch, id, metric, query, interval]);

  const rows = useMemo(
    () => (offered ? drawnRows(held.rows, { entity, minutes }) : NO_ROWS),
    [offered, held.rows, entity, minutes]
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
 * change and marks the host's series stale, so the ones a caller draws
 * are read again, the read a person asked for.
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
