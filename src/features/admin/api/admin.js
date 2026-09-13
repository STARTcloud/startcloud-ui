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
