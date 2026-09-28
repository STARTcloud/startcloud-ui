import { createContext, useCallback, useContext, useEffect } from 'react';

import { hostHasFeature } from '../utils/capabilities';
import { detailKey } from '../utils/machines';

import { useHostRow } from './useHostRow';

export const MachineDetailContext = createContext(null);

const EMPTY = { detail: null, loaded: false, failed: false, stale: false };

const NO_PROVIDER = {
  epoch: 0,
  machines: {},
  read: () => Promise.resolve(null),
};

/**
 * One machine's detail, `GET machines/{name}` at the path the role fixes,
 * from the hosts feature's context, so every surface of the machine page
 * shares one copy and one request: asked for by the first caller that
 * draws the machine and held for every other, asked for again by the
 * callers that draw it after the event stream opened fresh or answered
 * `reset`, after the `hosts` topic said the host's machines changed or
 * the `tasks` topic said a task of the machine ended, and on `refresh`,
 * the read a surface asks for after its own write or on the person's
 * Refresh; never on a clock. Nothing is asked of a host whose own row
 * does not list `machines`, because an agent without the surface answers
 * 404; `offered` says whether it does.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @returns {{ detail: Object|null, loaded: boolean, failed: boolean, offered: boolean, refresh: Function }} The detail
 */
export const useMachineDetail = (id, name) => {
  const server = useHostRow(id);
  const offered = hostHasFeature(server, 'machines');
  const { epoch, machines, read } = useContext(MachineDetailContext) || NO_PROVIDER;
  const { detail, loaded, failed, stale } = machines[detailKey(id, name)] || EMPTY;

  useEffect(() => {
    if (offered && (!loaded || stale)) {
      read(epoch, id, name);
    }
  }, [offered, loaded, stale, epoch, id, name, read]);

  const refresh = useCallback(() => {
    if (offered) {
      read(epoch, id, name);
    }
  }, [offered, read, epoch, id, name]);

  return {
    detail: offered ? detail : null,
    loaded: offered && loaded,
    failed: offered && failed,
    offered,
    refresh,
  };
};

/**
 * The read of a machine's detail for a caller that acted on a machine it
 * does not draw the detail of, the Controls menu, a row of the machines
 * list and the sidebar tree's menu: `refresh(id, name)` asks the agent
 * again only while that machine's detail is held, so a machine nobody
 * drew the page of is never asked for.
 *
 * @returns {Function} `refresh(id, name)`, answering a promise of the detail
 */
export const useMachineDetailRefresh = () => {
  const { epoch, machines, read } = useContext(MachineDetailContext) || NO_PROVIDER;
  return useCallback(
    (id, name) => (machines[detailKey(id, name)] ? read(epoch, id, name) : Promise.resolve(null)),
    [machines, read, epoch]
  );
};
