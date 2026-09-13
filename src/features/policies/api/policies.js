import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const PUBLIC = { auth: false };

export const policy = (name, region = '') =>
  client.get(encodePath('api', 'policies', name), {
    ...PUBLIC,
    params: region ? { region } : undefined,
  });
