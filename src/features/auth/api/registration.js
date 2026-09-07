import { client } from '../../../lib/runtime';

const OPTIONS = { auth: 'optional', headers: { Accept: 'application/json' } };

export const registration = body => client.post('/registration', body, OPTIONS);

export const resendRegistration = body => client.post('/registration/resend', body, OPTIONS);

export const verifyRegistration = body => client.post('/registration/verify', body, OPTIONS);
