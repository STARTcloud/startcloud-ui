import { client } from '../../../lib/runtime';

const OPTIONS = { auth: 'optional', headers: { Accept: 'application/json' } };
const FORM = { ...OPTIONS, contentType: 'form' };

/**
 * The second-factor state, answered as `{ status, etag, date, data }` so
 * the page reads the server's `Date` header beside the body and can tell
 * the person when their own clock is off.
 *
 * @param {string} method - The method asked about, empty for the server's resolution
 * @returns {Promise<{ status: number, etag: string, date: string, data: Object }>}
 */
export const tfaState = method =>
  client.get('/api/auth/tfa', { ...OPTIONS, etag: '', params: method ? { method } : undefined });

export const sendTfa = () => client.post('/api/auth/tfa/send', null, OPTIONS);

export const verifyTfa = ({ code, tfaMethod }) =>
  client.post('/authenticator', new URLSearchParams({ code, tfa_method: tfaMethod }), FORM);

export const resendTfa = () => client.post('/resend-tfa', null, OPTIONS);

export const tfaMethods = () => client.get('/api/auth/tfa/methods', OPTIONS);

export const pickTfaMethod = ({ tfaMethod, authenticatorId }) =>
  client.post(
    '/authenticator-method',
    new URLSearchParams({
      tfa_method: tfaMethod,
      ...(authenticatorId ? { authenticator_id: authenticatorId } : {}),
    }),
    FORM
  );
