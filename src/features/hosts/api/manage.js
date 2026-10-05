import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const encoded = value => encodeURIComponent(value);

const listOf = (data, member) => (Array.isArray(data?.[member]) ? data[member] : []);

/**
 * The services of a host, `GET services`, hyperweaver-ui's read: the
 * name pattern as `pattern`, the zone as `zone` and `all` while the
 * disabled ones are wanted, each only where given, answered as a list
 * of `{ fmri, state, stime }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} [options] - `pattern`, `zone` and `all`
 * @returns {Promise<Array<Object>>} The rows
 */
export const fetchServices = (status, id, { pattern = '', zone = '', all = false } = {}) =>
  client
    .get(agentPath(status, id, 'services'), {
      params: {
        ...(pattern ? { pattern } : {}),
        ...(zone ? { zone } : {}),
        ...(all ? { all: true } : {}),
      },
    })
    .then(data => (Array.isArray(data) ? data : listOf(data, 'services')));

/**
 * One service's detail, `GET services/{fmri}`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} fmri - The service's FMRI
 * @returns {Promise<Object>} The detail
 */
export const fetchService = (status, id, fmri) =>
  client.get(agentPath(status, id, `services/${encoded(fmri)}`));

/**
 * One service's properties, `GET services/{fmri}/properties`, never
 * asked of a legacy run script.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} fmri - The service's FMRI
 * @returns {Promise<Object>} The properties
 */
export const fetchServiceProperties = (status, id, fmri) =>
  client.get(agentPath(status, id, `services/${encoded(fmri)}/properties`));

/**
 * Act on one service, `POST services/action`, hyperweaver-ui's body: the
 * FMRI encoded, the action, `enable`, `disable`, `restart` or `refresh`,
 * and empty options.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} fmri - The service's FMRI
 * @param {string} action - The action
 * @returns {Promise<Object>} The agent's answer
 */
export const serviceAction = (status, id, fmri, action) =>
  client.post(agentPath(status, id, 'services/action'), {
    fmri: encoded(fmri),
    action,
    options: {},
  });

/**
 * The processes of a host, `GET system/processes`, hyperweaver-ui's
 * read: a thousand at most, the ceiling the agent accepts, the command
 * pattern as `command`, the zone, the user and `detailed`, each only
 * where given.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} [options] - `command`, `zone`, `user` and `detailed`
 * @returns {Promise<Array<Object>>} The rows
 */
export const fetchProcesses = (
  status,
  id,
  { command = '', zone = '', user = '', detailed = true } = {}
) =>
  client
    .get(agentPath(status, id, 'system/processes'), {
      params: {
        limit: 1000,
        ...(command ? { command } : {}),
        ...(zone ? { zone } : {}),
        ...(user ? { user } : {}),
        ...(detailed ? { detailed: true } : {}),
      },
    })
    .then(data => (Array.isArray(data) ? data : listOf(data, 'processes')));

/**
 * One process's detail, `GET system/processes/{pid}`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {number|string} pid - The process id
 * @returns {Promise<Object>} The detail
 */
export const fetchProcess = (status, id, pid) =>
  client.get(agentPath(status, id, `system/processes/${encoded(pid)}`));

/**
 * One process's open files, limits or stack,
 * `GET system/processes/{pid}/{files|limits|stack}`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {number|string} pid - The process id
 * @param {string} kind - `files`, `limits` or `stack`
 * @returns {Promise<*>} The agent's answer
 */
export const fetchProcessExtra = (status, id, pid, kind) =>
  client.get(agentPath(status, id, `system/processes/${encoded(pid)}/${kind}`));

/**
 * Kill one process, `POST system/processes/{pid}/kill` with `force`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {number|string} pid - The process id
 * @param {boolean} force - Whether to kill rather than terminate
 * @returns {Promise<Object>} The agent's answer
 */
export const killProcess = (status, id, pid, force) =>
  client.post(agentPath(status, id, `system/processes/${encoded(pid)}/kill`), {
    force: Boolean(force),
  });

/**
 * Send a signal to one process, `POST system/processes/{pid}/signal`
 * with `signal`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {number|string} pid - The process id
 * @param {string} signal - The signal's name, `TERM` and the rest
 * @returns {Promise<Object>} The agent's answer
 */
export const signalProcess = (status, id, pid, signal) =>
  client.post(agentPath(status, id, `system/processes/${encoded(pid)}/signal`), { signal });

/**
 * Kill every process whose command matches a pattern,
 * `POST system/processes/batch-kill` with the pattern, the signal and
 * the zone where given.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - `pattern`, `signal` and `zone`
 * @returns {Promise<Object>} The agent's answer
 */
export const batchKill = (status, id, { pattern, signal, zone = '' }) =>
  client.post(agentPath(status, id, 'system/processes/batch-kill'), {
    pattern,
    signal,
    ...(zone ? { zone } : {}),
  });

/**
 * The users of a host, `GET system/users`, hyperweaver-ui's read: the
 * username pattern, `include_system` while wanted and the limit.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} [options] - `username`, `includeSystem` and `limit`
 * @returns {Promise<Array<Object>>} The `users` rows
 */
export const fetchUsers = (status, id, { username = '', includeSystem = false, limit = 50 } = {}) =>
  client
    .get(agentPath(status, id, 'system/users'), {
      params: {
        ...(username ? { username } : {}),
        ...(includeSystem ? { include_system: true } : {}),
        limit,
      },
    })
    .then(data => listOf(data, 'users'));

/**
 * One user's extended attributes, `GET system/users/{name}/attributes`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} username - The user
 * @returns {Promise<Object>} The attributes
 */
export const fetchUserAttributes = (status, id, username) =>
  client.get(agentPath(status, id, `system/users/${encoded(username)}/attributes`));

/**
 * Create a user, `POST system/users` with the body of `userCreateBody`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body
 * @returns {Promise<Object>} The agent's answer, a task where queued
 */
export const createUser = (status, id, body) =>
  client.post(agentPath(status, id, 'system/users'), body);

/**
 * Modify a user, `PUT system/users/{name}` with the body of
 * `userEditBody`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} username - The user
 * @param {Object} body - The changed members
 * @returns {Promise<Object>} The agent's answer, a task where queued
 */
export const updateUser = (status, id, username, body) =>
  client.put(agentPath(status, id, `system/users/${encoded(username)}`), body);

/**
 * Delete a user, `DELETE system/users/{name}`, hyperweaver-ui's query:
 * the home directory and the personal group removed with it.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} username - The user
 * @returns {Promise<Object>} The agent's answer, a task where queued
 */
export const deleteUser = (status, id, username) =>
  client.delete(agentPath(status, id, `system/users/${encoded(username)}`), {
    params: { remove_home: true, delete_personal_group: true },
  });

/**
 * Lock a user's account, `POST system/users/{name}/lock`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} username - The user
 * @returns {Promise<Object>} The agent's answer
 */
export const lockUser = (status, id, username) =>
  client.post(agentPath(status, id, `system/users/${encoded(username)}/lock`));

/**
 * Unlock a user's account, `POST system/users/{name}/unlock`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} username - The user
 * @returns {Promise<Object>} The agent's answer
 */
export const unlockUser = (status, id, username) =>
  client.post(agentPath(status, id, `system/users/${encoded(username)}/unlock`));

/**
 * Set a user's password, `POST system/users/{name}/password` with the
 * body of `passwordBody`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} username - The user
 * @param {Object} body - The body
 * @returns {Promise<Object>} The agent's answer
 */
export const setUserPassword = (status, id, username, body) =>
  client.post(agentPath(status, id, `system/users/${encoded(username)}/password`), body);

/**
 * The groups of a host, `GET system/groups`, hyperweaver-ui's read: the
 * name pattern, `include_system` while wanted and the limit.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} [options] - `groupname`, `includeSystem` and `limit`
 * @returns {Promise<Array<Object>>} The `groups` rows
 */
export const fetchGroups = (
  status,
  id,
  { groupname = '', includeSystem = false, limit = 50 } = {}
) =>
  client
    .get(agentPath(status, id, 'system/groups'), {
      params: {
        ...(groupname ? { groupname } : {}),
        ...(includeSystem ? { include_system: true } : {}),
        limit,
      },
    })
    .then(data => listOf(data, 'groups'));

/**
 * Create a group, `POST system/groups` with the body of
 * `groupCreateBody`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body
 * @returns {Promise<Object>} The agent's answer, a task where queued
 */
export const createGroup = (status, id, body) =>
  client.post(agentPath(status, id, 'system/groups'), body);

/**
 * Delete a group, `DELETE system/groups/{name}`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} groupname - The group
 * @returns {Promise<Object>} The agent's answer, a task where queued
 */
export const deleteGroup = (status, id, groupname) =>
  client.delete(agentPath(status, id, `system/groups/${encoded(groupname)}`));

/**
 * The roles of a host, `GET system/roles`, hyperweaver-ui's read: the
 * name pattern and the limit.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} [options] - `rolename` and `limit`
 * @returns {Promise<Array<Object>>} The `roles` rows
 */
export const fetchRoles = (status, id, { rolename = '', limit = 50 } = {}) =>
  client
    .get(agentPath(status, id, 'system/roles'), {
      params: { ...(rolename ? { rolename } : {}), limit },
    })
    .then(data => listOf(data, 'roles'));

/**
 * Create a role, `POST system/roles` with the body of `roleCreateBody`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body
 * @returns {Promise<Object>} The agent's answer, a task where queued
 */
export const createRole = (status, id, body) =>
  client.post(agentPath(status, id, 'system/roles'), body);

/**
 * Delete a role, `DELETE system/roles/{name}`, hyperweaver-ui's query:
 * the home directory removed with it.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} rolename - The role
 * @returns {Promise<Object>} The agent's answer, a task where queued
 */
export const deleteRole = (status, id, rolename) =>
  client.delete(agentPath(status, id, `system/roles/${encoded(rolename)}`), {
    params: { remove_home: true },
  });

/**
 * The RBAC authorizations of a host, `GET system/rbac/authorizations`,
 * the filter where given and the limit.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} [options] - `filter` and `limit`
 * @returns {Promise<Array<Object>>} The `authorizations` rows
 */
export const fetchAuthorizations = (status, id, { filter = '', limit = 100 } = {}) =>
  client
    .get(agentPath(status, id, 'system/rbac/authorizations'), {
      params: { ...(filter ? { filter } : {}), limit },
    })
    .then(data => listOf(data, 'authorizations'));

/**
 * The RBAC profiles of a host, `GET system/rbac/profiles`, the filter
 * where given and the limit.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} [options] - `filter` and `limit`
 * @returns {Promise<Array<Object>>} The `profiles` rows
 */
export const fetchProfiles = (status, id, { filter = '', limit = 100 } = {}) =>
  client
    .get(agentPath(status, id, 'system/rbac/profiles'), {
      params: { ...(filter ? { filter } : {}), limit },
    })
    .then(data => listOf(data, 'profiles'));

/**
 * The RBAC roles of a host, `GET system/rbac/roles`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Array<Object>>} The `roles` rows
 */
export const fetchRbacRoles = (status, id) =>
  client.get(agentPath(status, id, 'system/rbac/roles')).then(data => listOf(data, 'roles'));

/**
 * The host's time zone, `GET system/timezone`,
 * `{ timezone, local_time, utc_offset }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The time zone
 */
export const fetchTimezone = (status, id) => client.get(agentPath(status, id, 'system/timezone'));

/**
 * The time zones the host knows, `GET system/timezones`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Array<string>>} The `timezones` names
 */
export const fetchTimezones = (status, id) =>
  client.get(agentPath(status, id, 'system/timezones')).then(data => listOf(data, 'timezones'));

/**
 * Set the host's time zone, `PUT system/timezone` with `timezone`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} timezone - The zone
 * @returns {Promise<Object>} The agent's answer
 */
export const setTimezone = (status, id, timezone) =>
  client.put(agentPath(status, id, 'system/timezone'), { timezone });

/**
 * The time synchronization status, `GET system/time-sync/status`: the
 * service, its status, whether it is available, the time zone, the
 * last check, `service_details` and the `peers`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The status
 */
export const fetchTimeSyncStatus = (status, id) =>
  client.get(agentPath(status, id, 'system/time-sync/status'));

/**
 * The time synchronization systems the host offers,
 * `GET system/time-sync/available-systems`, `{ available, current }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The systems
 */
export const fetchTimeSyncSystems = (status, id) =>
  client.get(agentPath(status, id, 'system/time-sync/available-systems'));

/**
 * Force a time synchronization, `POST system/time-sync/sync`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The agent's answer
 */
export const syncTime = (status, id) => client.post(agentPath(status, id, 'system/time-sync/sync'));

/**
 * Switch the time synchronization system, `POST system/time-sync/switch`,
 * hyperweaver-ui's body: the target, the servers preserved and the
 * package installed where needed.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} target - `ntp`, `chrony` or `ntpsec`
 * @returns {Promise<Object>} The agent's answer
 */
export const switchTimeSync = (status, id, target) =>
  client.post(agentPath(status, id, 'system/time-sync/switch'), {
    target_system: target,
    preserve_servers: true,
    install_if_needed: true,
  });

/**
 * The time synchronization configuration, `GET system/time-sync/config`:
 * the service, `config_file`, `config_exists`, `current_config` and
 * `suggested_defaults`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The configuration
 */
export const fetchTimeSyncConfig = (status, id) =>
  client.get(agentPath(status, id, 'system/time-sync/config'));

/**
 * Write the time synchronization configuration,
 * `PUT system/time-sync/config` with the text and whether the existing
 * file is backed up.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - `content` and `backup`
 * @returns {Promise<Object>} The agent's answer
 */
export const saveTimeSyncConfig = (status, id, { content, backup }) =>
  client.put(agentPath(status, id, 'system/time-sync/config'), {
    config_content: content,
    backup_existing: Boolean(backup),
  });

/**
 * Check for system updates, `GET system/updates/check` in the
 * structured format.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The check
 */
export const checkUpdates = (status, id) =>
  client.get(agentPath(status, id, 'system/updates/check'), { params: { format: 'structured' } });

/**
 * The update history, `GET system/updates/history`, twenty rows.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Array<Object>>} The `history` rows
 */
export const fetchUpdateHistory = (status, id) =>
  client
    .get(agentPath(status, id, 'system/updates/history'), { params: { limit: 20 } })
    .then(data => listOf(data, 'history'));

/**
 * Refresh the package metadata, `POST system/updates/refresh`,
 * hyperweaver-ui's body.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The agent's answer, a task where queued
 */
export const refreshUpdates = (status, id) =>
  client.post(agentPath(status, id, 'system/updates/refresh'), {
    full: false,
    publishers: ['omnios'],
  });

/**
 * Install every available update, `POST system/updates/install`,
 * hyperweaver-ui's body: every package, the licenses accepted and a
 * boot environment backed up.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The agent's answer, a task where queued
 */
export const installUpdates = (status, id) =>
  client.post(agentPath(status, id, 'system/updates/install'), {
    packages: [],
    accept_licenses: true,
    backup_be: true,
    reject_packages: [],
  });

/**
 * One configuration file of the agent, `GET config/{name}`, the raw
 * file of the config contract, a name of `status.config`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The file's name, `machines` or `storage`
 * @returns {Promise<Object>} The file
 */
export const fetchConfigFile = (status, id, name) =>
  client.get(agentPath(status, id, `config/${encoded(name)}`));

/**
 * Patch one configuration file of the agent, `PUT config/{name}` with
 * the JSON merge patch of the config contract, answered
 * `{ message, requires_restart }` or refused 422 with pointers.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The file's name, `machines` or `storage`
 * @param {Object} patch - The merge patch
 * @returns {Promise<Object>} The agent's answer
 */
export const patchConfigFile = (status, id, name, patch) =>
  client.put(agentPath(status, id, `config/${encoded(name)}`), patch);
