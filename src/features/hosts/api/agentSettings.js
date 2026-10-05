import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

import { fetchConfigFile, patchConfigFile } from './manage';

const contentTypeOf = body => (body instanceof FormData ? 'form' : 'json');

const schemaPromises = new Map();

const configSchema = path => {
  if (!schemaPromises.has(path)) {
    schemaPromises.set(
      path,
      client.get(path).catch(error => {
        schemaPromises.delete(path);
        throw error;
      })
    );
  }
  return schemaPromises.get(path);
};

const agentRoute = route => route.replace(/^\/api\//, '');

/**
 * The configuration adapter of one host, the shape the shared
 * `ConfigPage` reads over the admin adapter's `config`, bound to that
 * host through the path the role fixes: `get` and `update` are
 * `fetchConfigFile` and `patchConfigFile`, `config/<name>` of the agent;
 * `schema` is `config/<name>/schema`, fetched once per host and name and
 * shared by the configuration page and the sidebar tree's Configuration
 * node, a failed fetch forgotten so the next caller asks again;
 * `restartStatus` and `restart` are `config/restart-status` and
 * `config/restart`; and `action(route, method, body)` sends a schema's
 * `/api/...` action route to the agent as the path under it, so an
 * action reaches the agent through the server's proxy on the server
 * role.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {{ get: Function, schema: Function, update: Function, restartStatus: Function, restart: Function, action: Function }} The adapter
 */
export const hostConfig = (status, id) => ({
  get: name => fetchConfigFile(status, id, name),
  schema: name => configSchema(agentPath(status, id, `config/${encodeURIComponent(name)}/schema`)),
  update: (name, patch) => patchConfigFile(status, id, name, patch),
  restartStatus: () => client.get(agentPath(status, id, 'config/restart-status')),
  restart: () => client.post(agentPath(status, id, 'config/restart'), {}),
  action: (route, method, body) =>
    client.request({
      method,
      path: agentPath(status, id, agentRoute(route)),
      body,
      contentType: contentTypeOf(body),
    }),
});

/**
 * Whether a newer agent is published, `GET app/updates/check`,
 * `{ current_version, latest_version, update_available, release_url,
 * release_date, changelog }`, the last three null while the agent holds
 * none; an agent without the surface refuses, which draws no button.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The check
 */
export const checkAgentUpdate = (status, id) =>
  client.get(agentPath(status, id, 'app/updates/check'));

/**
 * Queue the agent's self-update, `POST app/updates/apply`, answered
 * `{ message, task_id, target_version }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The agent's answer
 */
export const applyAgentUpdate = (status, id) =>
  client.post(agentPath(status, id, 'app/updates/apply'));

/**
 * The agent's global secrets document, `GET secrets`, the six categories
 * each a list of entries.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The document
 */
export const fetchSecrets = (status, id) => client.get(agentPath(status, id, 'secrets'));

/**
 * Replace the submitted secret categories, `PUT secrets` with
 * `{ [category]: entries }`, a shallow merge over the document.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} categories - The categories to replace
 * @returns {Promise<Object>} The agent's answer
 */
export const saveSecrets = (status, id, categories) =>
  client.put(agentPath(status, id, 'secrets'), categories);
