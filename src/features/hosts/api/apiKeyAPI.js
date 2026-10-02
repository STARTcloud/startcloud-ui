import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

/**
 * The API keys of one agent, `GET api-keys` with `include_key`,
 * answered `{ entities: [{ id, name, description, is_active, last_used, created_at }] }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The answer
 */
export const getApiKeys = (status, id) =>
  client.get(agentPath(status, id, 'api-keys'), { params: { include_key: true } });

/**
 * Generate an API key, `POST api-keys/generate` with its name and
 * description, answered with the one-time `api_key`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The key's name
 * @param {string} description - The key's description
 * @returns {Promise<Object>} The answer
 */
export const generateApiKey = (status, id, name, description) =>
  client.post(agentPath(status, id, 'api-keys/generate'), { name, description });

/**
 * Generate the bootstrap key, `POST api-keys/bootstrap` with
 * hyperweaver-ui's fixed name and description.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The answer
 */
export const bootstrapApiKey = (status, id) =>
  client.post(agentPath(status, id, 'api-keys/bootstrap'), {
    name: 'Initial-Setup',
    description: 'Initial bootstrap API key',
  });

/**
 * Delete one API key, `DELETE api-keys/{id}`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string|number} keyId - The key's id
 * @returns {Promise<Object>} The answer
 */
export const deleteApiKey = (status, id, keyId) =>
  client.delete(agentPath(status, id, `api-keys/${encodeURIComponent(keyId)}`));
