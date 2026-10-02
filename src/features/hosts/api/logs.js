import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const encoded = value => encodeURIComponent(value);

/**
 * The syslog configuration of a host, `GET system/syslog/config`:
 * `service_fmri`, `service_status`, `config_file`, `config_content` and
 * the `parsed_rules`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The configuration
 */
export const fetchSyslogConfig = (status, id) =>
  client.get(agentPath(status, id, 'system/syslog/config'));

/**
 * The syslog facilities and levels a host knows,
 * `GET system/syslog/facilities`, `{ facilities, levels }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The facilities and the levels
 */
export const fetchSyslogFacilities = (status, id) =>
  client.get(agentPath(status, id, 'system/syslog/facilities'));

/**
 * Validate a syslog configuration, `POST system/syslog/validate` with
 * the text, answered `{ valid, errors, warnings, parsed_rules }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} content - The configuration text
 * @returns {Promise<Object>} The validation
 */
export const validateSyslogConfig = (status, id, content) =>
  client.post(agentPath(status, id, 'system/syslog/validate'), { config_content: content });

/**
 * Write a syslog configuration, `PUT system/syslog/config`,
 * hyperweaver-ui's body: the text, the existing file backed up and the
 * service reloaded.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} content - The configuration text
 * @returns {Promise<Object>} The agent's answer
 */
export const applySyslogConfig = (status, id, content) =>
  client.put(agentPath(status, id, 'system/syslog/config'), {
    config_content: content,
    backup_existing: true,
    reload_service: true,
  });

/**
 * Reload the syslog service, `POST system/syslog/reload`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The agent's answer
 */
export const reloadSyslog = (status, id) =>
  client.post(agentPath(status, id, 'system/syslog/reload'));

/**
 * Switch the logging service, `POST system/syslog/switch` with the
 * target, `syslog` or `rsyslog`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} target - The service to switch to
 * @returns {Promise<Object>} The agent's answer
 */
export const switchSyslog = (status, id, target) =>
  client.post(agentPath(status, id, 'system/syslog/switch'), { target });

/**
 * The log files of a host, `GET system/logs/list`, the `log_files` rows.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Array<Object>>} The rows
 */
export const fetchLogFiles = (status, id) =>
  client
    .get(agentPath(status, id, 'system/logs/list'))
    .then(data => (Array.isArray(data?.log_files) ? data.log_files : []));

/**
 * The content of one log, `GET system/logs/{name}` or, for a fault
 * manager log, `GET system/logs/fault-manager/{subtype}`, with the lines,
 * `tail`, and the grep and the since where given.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} path - The log's route, `logRouteOf`
 * @param {Object} params - The query, `logParamsOf`
 * @returns {Promise<Object>} The content
 */
export const fetchLogContent = (status, id, path, params) =>
  client.get(agentPath(status, id, path), { params });

/**
 * Start streaming one log, `POST system/logs/{name}/stream/start`,
 * hyperweaver-ui's body: the lines to follow and the grep pattern or
 * null, answered the session, its `session_id` the socket's.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The log's name
 * @param {Object} body - `follow_lines` and `grep_pattern`
 * @returns {Promise<Object>} The session
 */
export const startLogStream = (status, id, name, body) =>
  client.post(agentPath(status, id, `system/logs/${encoded(name)}/stream/start`), body);

/**
 * Stop a log stream, `DELETE system/logs/stream/{sessionId}/stop`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} sessionId - The session's id
 * @returns {Promise<Object>} The agent's answer
 */
export const stopLogStream = (status, id, sessionId) =>
  client.delete(agentPath(status, id, `system/logs/stream/${encoded(sessionId)}/stop`));
