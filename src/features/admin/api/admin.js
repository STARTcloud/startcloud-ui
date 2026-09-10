import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const user = userId => encodePath('api', 'users', userId);

const contentTypeOf = body => (body instanceof FormData ? 'form' : 'json');

export const suspendUser = userId => client.put(`${user(userId)}/suspend`, {});

export const resumeUser = userId => client.put(`${user(userId)}/resume`, {});

export const adminConfig = {
  get: configName => client.get(encodePath('api', 'config', configName)),
  schema: configName => client.get(encodePath('api', 'config', configName, 'schema')),
  update: (configName, patch) => client.put(encodePath('api', 'config', configName), patch),
  restartStatus: () => client.get('/api/config/restart-status'),
  restart: () => client.post('/api/config/restart', {}),
  action: (route, method, body) =>
    client.request({ method, path: route, body, contentType: contentTypeOf(body) }),
};

export const storage = () => client.get('/api/system/storage');

export const updateStatus = () => client.get('/api/system/update-check');
