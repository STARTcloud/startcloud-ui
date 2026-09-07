import { client } from '../../../lib/runtime';

const OPTIONS = { auth: 'optional', headers: { Accept: 'application/json' } };

export const passkeyRequestOptions = () =>
  client.post('/webauthn/authenticate/options', null, OPTIONS);

export const passkeyVerify = assertion => client.post('/login/webauthn', assertion, OPTIONS);
