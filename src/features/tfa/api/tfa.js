import { client } from '../../../lib/runtime';

const OPTIONS = { auth: 'optional', headers: { Accept: 'application/json' } };
const FORM = { ...OPTIONS, contentType: 'form' };

export const tfaState = method =>
  client.get('/api/auth/tfa', { ...OPTIONS, params: method ? { method } : undefined });

export const sendTfa = () => client.post('/api/auth/tfa/send', null, OPTIONS);

export const verifyTfa = ({ code, tfaMethod }) =>
  client.post('/authenticator', new URLSearchParams({ code, tfaMethod }), FORM);

export const resendTfa = () => client.post('/resend-tfa', null, OPTIONS);

export const tfaMethods = () => client.get('/api/auth/tfa/methods', OPTIONS);

export const pickTfaMethod = ({ tfaMethod, authenticatorId }) =>
  client.post(
    '/authenticator-method',
    new URLSearchParams({ tfaMethod, ...(authenticatorId ? { authenticatorId } : {}) }),
    FORM
  );
