import { client } from '../../../lib/runtime';

const OPTIONS = { auth: 'optional', headers: { Accept: 'application/json' } };

export const magicLinkRequest = body => client.post('/login/magic/request', body, OPTIONS);

export const magicLinkConsume = body => client.post('/login/magic', body, OPTIONS);

export const cancelSignIn = () => client.post('/auth-cancel', null, OPTIONS);

export const passwordRecovery = body => client.post('/passwordRecovery', body, OPTIONS);

export const passwordReset = body => client.post('/passwordReset', body, OPTIONS);
