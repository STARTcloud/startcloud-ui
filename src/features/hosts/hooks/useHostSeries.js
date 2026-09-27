import { createContext, useCallback, useContext, useEffect } from 'react';

import { DEFAULT_QUERY, SERIES, hostOffers } from '../utils/monitoring';

import { useHostRow } from './useHostRow';

export const HostSeriesContext = createContext(null);

const NO_ROWS = [];

const NO_METRICS = {};

const EMPTY = { rows: NO_ROWS, strategy: '', loaded: false, failed: false, stale: false };

const NO_PROVIDER = {
  epoch: 0,
  hosts: {},
  read: () => Promise.resolve(NO_ROWS),
  setQuery: () => undefined,
};

/**
 * One series of one host, `metric` naming it in `SERIES`, from the hosts
 * feature's context, so the chart, its expanded dialog and the bars that
 * draw its newest sample share one copy: the history is read once, over
 * the host's window and at its resolution, by the first caller that
 * draws the series, and between reads the series grows by the samples
 * the `monitoring` topic pushes; it is read again by the callers that
 * draw it after the event stream opened fresh or answered `reset`, after
 * the window or the resolution changed, and on `refresh`, and never on a
 * clock. Nothing is asked of a host whose own row does not list every
 * token the series names; `offered` says whether it does. `strategy` is
 * the agent's own word for how it answered, `realtime` of an agent that
 * keeps no history.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} metric - The series' key in `SERIES`, e.g. `cpu`
 * @returns {{ rows: Array<Object>, strategy: string, loaded: boolean, failed: boolean, offered: boolean, refresh: Function }} The series, oldest first
 */
export const useHostSeries = (id, metric) => {
  const server = useHostRow(id);
  const offered = hostOffers(server, SERIES[metric].tokens);
  const { epoch, hosts, read } = useContext(HostSeriesContext) || NO_PROVIDER;
  const query = hosts[id]?.query || DEFAULT_QUERY;
  const held = hosts[id]?.metrics?.[metric] || EMPTY;
  const { loaded, stale } = held;

  useEffect(() => {
    if (offered && (!loaded || stale)) {
      read({ epoch, id, metric, query });
    }
  }, [offered, loaded, stale, epoch, id, metric, query, read]);

  const refresh = useCallback(() => {
    if (offered) {
      read({ epoch, id, metric, query });
    }
  }, [offered, read, epoch, id, metric, query]);

  return {
    rows: offered ? held.rows : NO_ROWS,
    strategy: held.strategy,
    loaded: offered && loaded,
    failed: offered && held.failed,
    offered,
    refresh,
  };
};

/**
 * The window and the resolution one host's series are read over, shared
 * by every series of the host: `setQuery` takes the members that change
 * and marks the host's series stale, so the ones a caller draws are read
 * again over the new window, the read a person asked for.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {{ query: { window: string, resolution: string }, setQuery: Function }} The query and its writer
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
  const { epoch, hosts, read } = useContext(HostSeriesContext) || NO_PROVIDER;
  return useCallback(
    id => {
      const query = hosts[id]?.query || DEFAULT_QUERY;
      Object.keys(hosts[id]?.metrics || NO_METRICS).forEach(metric =>
        read({ epoch, id, metric, query })
      );
    },
    [epoch, hosts, read]
  );
};
