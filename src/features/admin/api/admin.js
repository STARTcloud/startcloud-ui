import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const user = userId => encodePath('api', 'users', userId);

const contentTypeOf = body => (body instanceof FormData ? 'form' : 'json');

const schemaPromises = new Map();

/**
 * The schema of one configuration file, fetched once per page load and
 * shared by the configuration page and the sidebar's configuration tree;
 * a failed fetch is forgotten so the next caller asks again.
 *
 * @param {string} configName - A name of `status.config`
 * @returns {Promise<Object>} The schema document
 */
const configSchema = configName => {
  if (!schemaPromises.has(configName)) {
    schemaPromises.set(
      configName,
      client.get(encodePath('api', 'config', configName, 'schema')).catch(error => {
        schemaPromises.delete(configName);
        throw error;
      })
    );
  }
  return schemaPromises.get(configName);
};

export const suspendUser = userId => client.put(`${user(userId)}/suspend`, {});

export const resumeUser = userId => client.put(`${user(userId)}/resume`, {});

/**
 * The global role names the backend holds, `GET /api/roles`, its
 * `{ roles }` answer unwrapped to the array the Roles dialog's catalog
 * reads.
 *
 * @returns {Promise<string[]>} The role names in table order
 */
export const roleNames = () => client.get('/api/roles').then(answer => answer.roles);

/**
 * Writes one user's whole set of global roles, `PUT /api/users/{id}/roles`.
 *
 * @param {string|number} userId - The user's id
 * @param {string[]} roles - The whole set
 * @returns {Promise<Object>} The answer, `{ message, roles }`
 */
export const setUserRoles = (userId, roles) => client.put(`${user(userId)}/roles`, { roles });

export const adminConfig = {
  get: configName => client.get(encodePath('api', 'config', configName)),
  schema: configSchema,
  update: (configName, patch) => client.put(encodePath('api', 'config', configName), patch),
  restartStatus: () => client.get('/api/config/restart-status'),
  restart: () => client.post('/api/config/restart', {}),
  action: (route, method, body) =>
    client.request({ method, path: route, body, contentType: contentTypeOf(body) }),
};

export const storage = () => client.get('/api/system/storage');

export const updateStatus = () => client.get('/api/system/update-check');
