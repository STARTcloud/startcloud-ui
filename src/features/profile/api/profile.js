import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const PUBLIC = { auth: false };

const user = userId => encodePath('api', 'users', userId);

export const removeAccount = userId => client.delete(user(userId));

export const resendVerification = () => client.post('/api/auth/resend-verification', {});

export const verifyMail = token =>
  client.get(encodePath('api', 'auth', 'verify-mail', token), PUBLIC);

export const changePassword = (userId, password) =>
  client.put(`${user(userId)}/change-password`, { password });

/**
 * The caller's own password changed on a host that answers
 * `POST /api/auth/change-password`.
 *
 * @param {{ current_password: string, new_password: string, confirm_password: string }} body - The wire body
 * @returns {Promise<Object>} The answer
 */
export const changeOwnPassword = body => client.post('/api/auth/change-password', body);

/**
 * The caller's own account deleted on a host that answers
 * `DELETE /api/auth/delete-account`, the body on the DELETE as the host
 * takes it.
 *
 * @param {{ password: string, confirm_text: string }} body - The password and the typed word
 * @returns {Promise<Object>} The answer, `next` where the host names where to go
 */
export const deleteOwnAccount = body => client.delete('/api/auth/delete-account', { body });

export const changeEmail = (userId, newEmail) =>
  client.put(`${user(userId)}/change-email`, { new_email: newEmail });

export const changeName = (userId, name) => client.put(`${user(userId)}/change-name`, { name });

export const patchProfile = body => client.patch('/api/user', body);

export const leaveOrganization = organization =>
  client.post(encodePath('api', 'user', 'leave', organization), {});

export const setPrimaryOrganization = organization =>
  client.put(encodePath('api', 'user', 'primary-organization', organization), {});

export const myRequests = () => client.get('/api/user/requests');

export const cancelRequest = requestId =>
  client.delete(encodePath('api', 'user', 'requests', requestId));

export const serviceAccounts = {
  create: (description, expirationDays, organizationId, role) =>
    client.post('/api/service-accounts/', {
      description,
      expiration_days: expirationDays,
      organization_id: organizationId,
      role,
    }),
  organizations: () => client.get('/api/service-accounts/organizations'),
  list: () => client.get('/api/service-accounts/'),
  remove: id => client.delete(encodePath('api', 'service-accounts', id)),
};
