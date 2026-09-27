import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';

import { visibleStats } from '../utils/organizations';

import { useHeldMachines, useHostMachinesLoad, useHostMachinesRevision } from './useHostMachines';

export const HostStatsContext = createContext(null);

const EMPTY = { stats: null, loaded: false, failed: false, stale: false };

const NO_PROVIDER = {
  epoch: 0,
  hosts: {},
  read: () => Promise.resolve(null),
  load: () => Promise.resolve(null),
  organization: '',
  turns: 0,
};

const narrowedBy =
  ({ load, loadRows, organization }) =>
  async id => {
    const [stats, machines] = await Promise.all([load(id), loadRows(id)]);
    return visibleStats(stats, machines, organization);
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
 * answered or failed. While an organization is chosen the machine names,
 * `allmachines`, are the ones that show under it (`visibleStats`): the
 * host's machine rows are read beside the stats, the one copy per host
 * every caller shares, `loaded` waits for them so no name outside the
 * choice is drawn first, and `refresh` reads them again with the stats;
 * while the choice is All the stats are the agent's own and no machine
 * row is asked for.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {{ stats: Object|null, loaded: boolean, failed: boolean, refresh: Function }} The stats
 */
export const useHostStats = id => {
  const { epoch, hosts, read, organization } = useContext(HostStatsContext) || NO_PROVIDER;
  const { stats, loaded, failed, stale } = hosts[id] || EMPTY;
  const narrowed = Boolean(organization);
  const rows = useHeldMachines(id, narrowed);

  useEffect(() => {
    if (!loaded || stale) {
      read(epoch, id);
    }
  }, [loaded, stale, epoch, id, read]);

  const { refresh: refreshRows } = rows;

  const refresh = useCallback(() => {
    read(epoch, id);
    if (narrowed) {
      refreshRows();
    }
  }, [read, epoch, id, narrowed, refreshRows]);

  const visible = useMemo(
    () => visibleStats(stats, rows.machines, organization),
    [stats, rows.machines, organization]
  );

  return { stats: visible, loaded: loaded && (!narrowed || rows.loaded), failed, refresh };
};

/**
 * The stats of a host for a caller that is no component, the sidebar
 * tree's `children`: `load(id)` answers the copy held while it is fresh
 * and the one request, in flight or new, otherwise; null when the agent
 * failed. While an organization is chosen the host's machine rows are
 * loaded beside the stats, held or asked for the same way, and the
 * machine names answered are the ones that show under it; while the
 * choice is All `load` is the provider's own and asks for the stats
 * alone.
 *
 * @returns {Function} `load(id)`, answering a promise of the stats
 */
export const useHostStatsLoad = () => {
  const { load, organization } = useContext(HostStatsContext) || NO_PROVIDER;
  const loadRows = useHostMachinesLoad();
  return useMemo(
    () => (organization ? narrowedBy({ load, loadRows, organization }) : load),
    [load, loadRows, organization]
  );
};

/**
 * The read of a host's stats for a caller that acted on several hosts at
 * once, the bulk actions dialog: `refresh(id)` asks the named agent again
 * and renews the copy every caller holds.
 *
 * @returns {Function} `refresh(id)`, answering a promise of the stats
 */
export const useHostStatsRefresh = () => {
  const { epoch, read } = useContext(HostStatsContext) || NO_PROVIDER;
  return useCallback(id => read(epoch, id), [read, epoch]);
};

/**
 * The revision of every host's held copy, a number the provider raises
 * by one on each answer, zero for a host not yet read: the word a tree
 * node carries so the sidebar asks for its children again when the copy
 * was renewed. The number is the sum of the stats' own revision, the
 * revision of the host's machine rows and the turns of the organization
 * chosen, each of which only rises, so it moves as well when the rows
 * the names are narrowed by were renewed and when the choice changed.
 *
 * @returns {Function} `revisionOf(id)`, answering the host's revision
 */
export const useHostStatsRevision = () => {
  const { hosts, turns } = useContext(HostStatsContext) || NO_PROVIDER;
  const rowsRevisionOf = useHostMachinesRevision();
  return useCallback(
    id => (hosts[id]?.revision || 0) + rowsRevisionOf(id) + turns,
    [hosts, rowsRevisionOf, turns]
  );
};
