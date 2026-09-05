import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const user = userId => encodePath('api', 'users', userId);

export const suspendUser = userId => client.put(`${user(userId)}/suspend`, {});

export const resumeUser = userId => client.put(`${user(userId)}/resume`, {});

export const adminConfig = {
  get: configName => client.get(encodePath('api', 'config', configName)),
  schema: configName => client.get(encodePath('api', 'config', configName, 'schema')),
  update: (configName, configData) =>
    client.put(encodePath('api', 'config', configName), configData),
  restart: () => client.post('/api/config/restart', {}),
  testSmtp: email => client.post('/api/mail/test-smtp', { testEmail: email }),
  uploadSsl: (file, targetPath) =>
    client.post('/api/config/ssl/upload', file, {
      params: { targetPath },
      contentType: 'octet-stream',
    }),
};

export const storage = () => client.get('/api/system/storage');

export const updateStatus = () => client.get('/api/system/update-check');
