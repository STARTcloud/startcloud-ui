import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const PUBLIC = { auth: false };

export const resendVerification = signal =>
  client.post('/api/auth/resend-verification', {}, { signal });

export const verifyMail = token =>
  client.get(encodePath('api', 'auth', 'verify-mail', token), PUBLIC);
