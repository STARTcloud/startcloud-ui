import { useCallback, useMemo, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import {
  fetchAuthorizations,
  fetchGroups,
  fetchProcesses,
  fetchProfiles,
  fetchRbacRoles,
  fetchRoles,
  fetchServices,
  fetchTimeSyncStatus,
  fetchUpdateHistory,
  fetchUsers,
} from '../api/manage';
import { hostHasFeature } from '../utils/capabilities';

import { useManageRead } from './useHostManage';

/**
 * The request filters the tables of the Manage page open with,
 * hyperweaver-ui's: every zone and every user, the disabled services
 * left out, the processes detailed, the system accounts left out,
 * fifty users, groups and roles, a hundred authorizations and profiles.
 */
export const MANAGE_PARAMS = {
  services: { zone: '', all: false },
  processes: { zone: '', user: '', detailed: true },
  users: { includeSystem: false, limit: 50 },
  groups: { includeSystem: false, limit: 50 },
  roles: { limit: 50 },
  authorizations: { limit: 100 },
  profiles: { limit: 100 },
};

const NO_ROWS = [];

const rowsOf = reading => (Array.isArray(reading.data) ? reading.data : NO_ROWS);

/**
 * The reads the tables of the Manage page draw, held once at the page
 * so its one search binding narrows them all: the services, the
 * processes, the users, the groups, the roles, the three RBAC lists,
 * the time synchronization status, whose peers are the peer table, and
 * the update history, each behind the token of its section, hyperweaver-ui's
 * request filters kept as `params` and `setParam(table, key, value)`, a
 * change sending the request again the way hyperweaver-ui reloaded on
 * a filter change, with no debounce.
 *
 * @param {Object} options - The host
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {Object|null} options.server - The registry row, or the one serving agent's
 * @returns {{ params: Object, setParam: Function, resetParams: Function, reads: Object, rows: Object }} The data
 */
export const useHostManageData = ({ id, server }) => {
  const status = useStatus();
  const [params, setParams] = useState(MANAGE_PARAMS);
  const services = hostHasFeature(server, 'services');
  const processes = hostHasFeature(server, 'processes');
  const accounts = hostHasFeature(server, 'system-users');
  const time = hostHasFeature(server, 'time-sync');
  const packages = hostHasFeature(server, 'packages');

  const setParam = useCallback((table, key, value) => {
    setParams(current => ({ ...current, [table]: { ...current[table], [key]: value } }));
  }, []);

  const resetParams = useCallback(table => {
    setParams(current => ({ ...current, [table]: MANAGE_PARAMS[table] }));
  }, []);

  const reads = {
    services: useManageRead(
      useCallback(() => fetchServices(status, id, params.services), [status, id, params.services]),
      services
    ),
    processes: useManageRead(
      useCallback(
        () => fetchProcesses(status, id, params.processes),
        [status, id, params.processes]
      ),
      processes
    ),
    users: useManageRead(
      useCallback(() => fetchUsers(status, id, params.users), [status, id, params.users]),
      accounts
    ),
    groups: useManageRead(
      useCallback(() => fetchGroups(status, id, params.groups), [status, id, params.groups]),
      accounts
    ),
    roles: useManageRead(
      useCallback(() => fetchRoles(status, id, params.roles), [status, id, params.roles]),
      accounts
    ),
    authorizations: useManageRead(
      useCallback(
        () => fetchAuthorizations(status, id, params.authorizations),
        [status, id, params.authorizations]
      ),
      accounts
    ),
    profiles: useManageRead(
      useCallback(() => fetchProfiles(status, id, params.profiles), [status, id, params.profiles]),
      accounts
    ),
    rbacRoles: useManageRead(
      useCallback(() => fetchRbacRoles(status, id), [status, id]),
      accounts
    ),
    timeSync: useManageRead(
      useCallback(() => fetchTimeSyncStatus(status, id), [status, id]),
      time
    ),
    history: useManageRead(
      useCallback(() => fetchUpdateHistory(status, id), [status, id]),
      packages
    ),
  };

  const peers = useMemo(
    () => (Array.isArray(reads.timeSync.data?.peers) ? reads.timeSync.data.peers : NO_ROWS),
    [reads.timeSync.data]
  );

  const rows = {
    services: rowsOf(reads.services),
    processes: rowsOf(reads.processes),
    users: rowsOf(reads.users),
    groups: rowsOf(reads.groups),
    roles: rowsOf(reads.roles),
    authorizations: rowsOf(reads.authorizations),
    profiles: rowsOf(reads.profiles),
    rbacRoles: rowsOf(reads.rbacRoles),
    peers,
    history: rowsOf(reads.history),
  };

  return { params, setParam, resetParams, reads, rows };
};
