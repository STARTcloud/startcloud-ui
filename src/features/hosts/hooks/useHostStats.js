import { createContext, useCallback, useContext, useEffect } from 'react';

export const HostStatsContext = createContext(null);

const EMPTY = { stats: null, loaded: false, failed: false, stale: false };

const NO_PROVIDER = {
  epoch: 0,
  hosts: {},
  read: () => Promise.resolve(null),
  load: () => Promise.resolve(null),
};

/**
 * One agent's stats, `stats` at the path the role fixes, from the hosts
 * feature's context, so the page, the Controls menu and the sidebar's
 * tree share one copy and one request per host: asked for by the first
 * caller that draws the host and held for every other, asked for again
 * by the callers that draw it after the event stream opened fresh or
 * answered `reset`, and on `refresh`, the read a page asks for after an
 * action's response or on the person's Refresh, which renews the copy
 * every caller holds; `loaded` answers true once the named agent has
 * answered or failed.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {{ stats: Object|null, loaded: boolean, failed: boolean, refresh: Function }} The stats
 */
export const useHostStats = id => {
  const { epoch, hosts, read } = useContext(HostStatsContext) || NO_PROVIDER;
  const { stats, loaded, failed, stale } = hosts[id] || EMPTY;

  useEffect(() => {
    if (!loaded || stale) {
      read(epoch, id);
    }
  }, [loaded, stale, epoch, id, read]);

  const refresh = useCallback(() => {
    read(epoch, id);
  }, [read, epoch, id]);

  return { stats, loaded, failed, refresh };
};

/**
 * The stats of a host for a caller that is no component, the sidebar
 * tree's `children`: `load(id)` answers the copy held while it is fresh
 * and the one request, in flight or new, otherwise; null when the agent
 * failed.
 *
 * @returns {Function} `load(id)`, answering a promise of the stats
 */
export const useHostStatsLoad = () => (useContext(HostStatsContext) || NO_PROVIDER).load;

/**
 * The revision of every host's held copy, a number the provider raises
 * by one on each answer, zero for a host not yet read: the word a tree
 * node carries so the sidebar asks for its children again when the copy
 * was renewed.
 *
 * @returns {Function} `revisionOf(id)`, answering the host's revision
 */
export const useHostStatsRevision = () => {
  const { hosts } = useContext(HostStatsContext) || NO_PROVIDER;
  return useCallback(id => hosts[id]?.revision || 0, [hosts]);
};
