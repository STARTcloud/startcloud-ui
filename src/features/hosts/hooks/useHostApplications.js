import { createContext, useContext, useEffect } from 'react';

import { hostHasFeature } from '../utils/capabilities';

import { useHostRow } from './useHostRow';

export const HostApplicationsContext = createContext(null);

const EMPTY = { applications: [], loaded: false, failed: false, stale: false };

const NO_PROVIDER = {
  epoch: 0,
  hosts: {},
  ask: () => Promise.resolve(null),
};

const NO_APPLICATIONS = [];

/**
 * One host's applications, `GET applications` at the path the role fixes,
 * from the hosts feature's context, so the machine commands of every
 * machine of the host share one copy and one request: asked for once,
 * the first time a caller wants it, and held for every later caller,
 * asked for again by a caller that wants it after the event stream opened
 * fresh or answered `reset`; never on a clock. Nothing is asked of a host
 * whose own row does not list `host-launchers`.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {boolean} wanted - Whether the caller wants the applications now
 * @returns {{ applications: Array<Object>, loaded: boolean, offered: boolean }} The applications
 */
export const useHostApplications = (id, wanted) => {
  const server = useHostRow(id);
  const offered = hostHasFeature(server, 'host-launchers');
  const { epoch, hosts, ask } = useContext(HostApplicationsContext) || NO_PROVIDER;
  const { applications, loaded, stale } = hosts[id] || EMPTY;

  useEffect(() => {
    if (wanted && offered && (!loaded || stale)) {
      ask(epoch, id);
    }
  }, [wanted, offered, loaded, stale, epoch, id, ask]);

  return {
    applications: offered ? applications : NO_APPLICATIONS,
    loaded: offered && loaded,
    offered,
  };
};
