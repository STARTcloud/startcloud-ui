import { client } from '../../../lib/runtime';

const PUBLIC = { auth: false };

export const register = body => client.post('/api/auth/signup', body, PUBLIC);
