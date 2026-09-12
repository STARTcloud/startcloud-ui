import { client } from '../../../lib/runtime';

const OPTIONS = { auth: 'optional', headers: { Accept: 'application/json' } };

export const bootstrapConsume = body => client.post('/login/bootstrap', body, OPTIONS);
