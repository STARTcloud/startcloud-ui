import { createContext, useCallback, useContext, useEffect } from 'react';

import { hostHasFeature } from '../utils/capabilities';
import { detailKey } from '../utils/machines';

import { useHostRow } from './useHostRow';

export const MachineSnapshotsContext = createContext(null);

const NO_ROWS = [];

const EMPTY = { snapshots: NO_ROWS, loaded: false, failed: false, message: '', stale: false };

const NO_PROVIDER = {
  epoch: 0,
  machines: {},
  read: () => Promise.resolve(NO_ROWS),
  ask: () => Promise.resolve(NO_ROWS),
};

/**
 * One machine's snapshots, `GET machines/{name}/snapshots` at the path
 * the role fixes, from the hosts feature's context, so the list on the
 * machine page and the pickers of the clone and the template dialogs
 * share one copy and one request: asked for by the first caller that
 * draws them and held for every other, asked for again by the callers
 * that draw them after the event stream opened fresh or answered
 * `reset`, after the `tasks` topic said a task of the machine ended, and
 * on `refresh`, the read a caller asks for after its own write or on the
 * person's Refresh; never on a clock. Nothing is asked of a host whose
 * own row does not list `machine-snapshots`, because an agent without
 * the surface answers 404, and nothing while `wanted` is false, the way
 * a machine on UTM is not asked while it runs, the agent refusing the
 * list of one; `offered` says whether the host lists the token, and
 * `message` is the agent's own word for a read that failed.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {boolean} [wanted] - Whether the caller needs the snapshots read
 * @returns {{ snapshots: Array<Object>, loaded: boolean, failed: boolean, message: string, offered: boolean, refresh: Function }} The snapshots
 */
export const useMachineSnapshots = (id, name, wanted = true) => {
  const server = useHostRow(id);
  const offered = hostHasFeature(server, 'machine-snapshots');
  const asked = offered && wanted;
  const { epoch, machines, read, ask } = useContext(MachineSnapshotsContext) || NO_PROVIDER;
  const { snapshots, loaded, failed, message, stale } = machines[detailKey(id, name)] || EMPTY;

  useEffect(() => {
    if (asked && (!loaded || stale)) {
      ask(epoch, id, name);
    }
  }, [asked, loaded, stale, epoch, id, name, ask]);

  const refresh = useCallback(() => {
    if (asked) {
      read(epoch, id, name);
    }
  }, [asked, read, epoch, id, name]);

  return {
    snapshots: asked ? snapshots : NO_ROWS,
    loaded: asked && loaded,
    failed: asked && failed,
    message: asked && failed ? message : '',
    offered,
    refresh,
  };
};

/**
 * The read of a machine's snapshots for a caller that wrote to a machine
 * it does not draw the snapshots of, the Controls menu and the sidebar
 * tree's menu: `refresh(id, name)` asks the agent again only while that
 * machine's snapshots are held, so a machine nobody drew the snapshots
 * of is never asked for.
 *
 * @returns {Function} `refresh(id, name)`, answering a promise of the snapshots
 */
export const useMachineSnapshotsRefresh = () => {
  const { epoch, machines, read } = useContext(MachineSnapshotsContext) || NO_PROVIDER;
  return useCallback(
    (id, name) =>
      machines[detailKey(id, name)] ? read(epoch, id, name) : Promise.resolve(NO_ROWS),
    [machines, read, epoch]
  );
};
