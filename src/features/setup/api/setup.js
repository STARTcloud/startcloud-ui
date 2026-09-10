import { client } from '../../../lib/runtime';

const PUBLIC = { auth: false };

const setupAuth = token => ({ ...PUBLIC, headers: { Authorization: `Bearer ${token}` } });

const contentTypeOf = body => (body instanceof FormData ? 'form' : 'json');

export const setupApi = {
  status: () => client.get('/api/setup/status', PUBLIC),
  verify: token => client.post('/api/setup/verify-token', { token }, PUBLIC),
  get: token => client.get('/api/setup', setupAuth(token)),
  schema: token => client.get('/api/setup/schema', setupAuth(token)),
  update: (token, configs) => client.put('/api/setup', { configs }, setupAuth(token)),
  action: (token, route, method, body) =>
    client.request({
      method,
      path: route,
      body,
      contentType: contentTypeOf(body),
      ...setupAuth(token),
    }),
};
