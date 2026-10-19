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
 * release_date, changelog, release_notes, assets, releases }`,
 * `release_notes` the release's markdown, `assets` an array of
 * `{ name, url, size, checksum }` with the size in bytes and the checksum
 * optional, and `releases` the repository's releases newest first, each
 * `{ tag, name, prerelease, published_at, author, html_url, body, assets }`
 * with `assets` an array of `{ name, size, sha256, browser_download_url }`,
 * each of the last six null while the agent holds none; an agent without
 * the surface refuses, which draws no button.
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

const certPath = (status, id, rowId) => agentPath(status, id, `certs/${encodeURIComponent(rowId)}`);

/**
 * The rows of the host's own certificate store, `GET certs`, narrowed to
 * one kind through `kind` where given.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {{ kind?: string }} [query] - The narrowing
 * @returns {Promise<Array<Object>>} The rows
 */
export const fetchHostCerts = (status, id, { kind = '' } = {}) =>
  client.get(agentPath(status, id, 'certs'), { params: kind ? { kind } : undefined });

/**
 * Create one row of the host's store, `POST certs`, the body the wire row
 * of `rowOf`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The wire row
 * @returns {Promise<Object>} The row created
 */
export const createHostCert = (status, id, body) =>
  client.post(agentPath(status, id, 'certs'), body);

/**
 * Replace one row of the host's store, `PUT certs/{id}`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} rowId - The row's id
 * @param {Object} body - The wire row
 * @returns {Promise<Object>} The row as stored
 */
export const updateHostCert = (status, id, rowId, body) =>
  client.put(certPath(status, id, rowId), body);

/**
 * Remove one row of the host's store, `DELETE certs/{id}`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} rowId - The row's id
 * @returns {Promise<Object>} The agent's answer
 */
export const removeHostCert = (status, id, rowId) => client.delete(certPath(status, id, rowId));
