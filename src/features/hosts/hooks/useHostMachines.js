import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';

import { hostHasFeature } from '../utils/capabilities';
import { visibleRows } from '../utils/organizations';

import { useHostRow } from './useHostRow';

export const HostMachinesContext = createContext(null);

const EMPTY = { machines: [], loaded: false, failed: false, message: '', stale: false };

const NO_PROVIDER = {
  epoch: 0,
  hosts: {},
  read: () => Promise.resolve([]),
  ask: () => Promise.resolve([]),
  load: () => Promise.resolve([]),
  organization: '',
};

/**
 * One agent's machine rows as the agent answered them, every row whatever
 * the organization chosen, from the hosts feature's context: asked for
 * while `wanted` by the first caller that draws the host and held for
 * every other, asked for again by the callers that want it after the
 * event stream opened fresh or answered `reset`, and on `refresh`. A
 * caller that passes `wanted` false reads what is held and asks for
 * nothing, the way the stats of a host read the rows only while an
 * organization is chosen. `message` is the agent's own word for a read
 * that failed.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {boolean} wanted - Whether the caller needs the rows read
 * @returns {{ machines: Array<Object>, loaded: boolean, failed: boolean, message: string, refresh: Function }} The rows
 */
export const useHeldMachines = (id, wanted) => {
  const { epoch, hosts, read, ask } = useContext(HostMachinesContext) || NO_PROVIDER;
  const { machines, loaded, failed, message, stale } = hosts[id] || EMPTY;

  useEffect(() => {
    if (wanted && (!loaded || stale)) {
      ask(epoch, id);
    }
  }, [wanted, loaded, stale, epoch, id, ask]);

  const refresh = useCallback(() => {
    read(epoch, id);
  }, [read, epoch, id]);

  return { machines, loaded, failed, message, refresh };
};

/**
 * One agent's machine rows, `machines` at the path the role fixes, from
 * the hosts feature's context, so every caller that draws a host's
 * machines shares one copy and one request per host: asked for by the
 * first caller that draws the host and held for every other, asked for
 * again by the callers that draw it after the event stream opened fresh
 * or answered `reset`, and on `refresh`, the read a caller asks for after
 * an action's response; `loaded` answers true once the named agent has
 * answered or failed. The rows are the ones that show under the
 * organization a person operates under (`visibleUnder`, failing open),
 * every row while the choice is All. A caller that passes `wanted` false
 * asks for nothing, the way a page asks nothing of a host whose own row
 * does not list `machines`.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {boolean} [wanted] - Whether the caller needs the rows read
 * @returns {{ machines: Array<Object>, loaded: boolean, failed: boolean, message: string, refresh: Function }} The rows
 */
export const useHostMachines = (id, wanted = true) => {
  const { organization } = useContext(HostMachinesContext) || NO_PROVIDER;
  const { machines, loaded, failed, message, refresh } = useHeldMachines(id, wanted);
  const visible = useMemo(() => visibleRows(machines, organization), [machines, organization]);
  return { machines: visible, loaded, failed, message, refresh };
};

/**
 * The read of a host's machine rows for a caller that acted on a host it
 * does not draw, the sidebar tree's menu: `refresh(id)` asks the named
 * agent again only while its rows are held, so a host nobody draws the
 * rows of is never asked.
 *
 * @returns {Function} `refresh(id)`, answering a promise of the rows
 */
export const useHostMachinesRefresh = () => {
  const { epoch, hosts, read } = useContext(HostMachinesContext) || NO_PROVIDER;
  return useCallback(
    id => (hosts[id] ? read(epoch, id) : Promise.resolve([])),
    [hosts, read, epoch]
  );
};

/**
 * The machine rows of a host for a caller that is no component, the
 * narrowing of a host's stats behind the sidebar tree's `children` and
 * the bulk actions dialog: `load(id)` answers the rows held while they
 * are fresh and the one request, in flight or new, otherwise, every row
 * whatever the organization chosen, an empty list when the agent failed.
 *
 * @returns {Function} `load(id)`, answering a promise of the rows
 */
export const useHostMachinesLoad = () => (useContext(HostMachinesContext) || NO_PROVIDER).load;

/**
 * The revision of every host's held rows, a number the provider raises
 * by one on each answer, zero for a host not yet read.
 *
 * @returns {Function} `revisionOf(id)`, answering the host's revision
 */
export const useHostMachinesRevision = () => {
  const { hosts } = useContext(HostMachinesContext) || NO_PROVIDER;
  return useCallback(id => hosts[id]?.revision || 0, [hosts]);
};

/**
 * One machine's row of its host's held rows, null while the host has not
 * answered or lists no machine of that name. The row is read whatever
 * the organization chosen, because the route names the machine and its
 * own hypervisor and state gate the rows of its menu. Nothing is asked of
 * a host whose own row does not list `machines`, because an agent without
 * the surface answers 404; `offered` says whether it does, and `loaded`
 * whether the rows answered.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {{ machine: Object|null, loaded: boolean, offered: boolean, refresh: Function }} The row
 */
export const useMachineRow = (id, name) => {
  const offered = hostHasFeature(useHostRow(id), 'machines');
  const { machines, loaded, refresh: read } = useHeldMachines(id, offered);

  const refresh = useCallback(() => {
    if (offered) {
      read();
    }
  }, [offered, read]);

  return {
    machine: machines.find(row => row.name === name) || null,
    loaded: offered && loaded,
    offered,
    refresh,
  };
};
