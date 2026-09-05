import { client } from '../../../lib/runtime';

const PUBLIC = { auth: false };

export const methods = () => client.get('/api/auth/methods', PUBLIC);
