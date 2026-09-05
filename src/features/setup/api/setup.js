import { client } from '../../../lib/runtime';

const PUBLIC = { auth: false };

const setupAuth = token => ({ ...PUBLIC, headers: { Authorization: `Bearer ${token}` } });

const uploadSslForm = (token, file) => {
  const form = new FormData();
  form.append('file', file);
  return client.post('/api/setup/upload-ssl', form, { ...setupAuth(token), contentType: 'form' });
};

export const setupApi = {
  verifyToken: token => client.post('/api/setup/verify-token', { token }, PUBLIC),
  configs: token => client.get('/api/setup', setupAuth(token)),
  schemas: token => client.get('/api/setup/schema', setupAuth(token)),
  update: (token, configs) => client.put('/api/setup', { configs }, setupAuth(token)),
  status: () => client.get('/api/setup/status', PUBLIC),
  uploadSsl: uploadSslForm,
};
