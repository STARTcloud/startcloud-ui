import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const user = userId => encodePath('api', 'users', userId);

export const removeAccount = userId => client.delete(user(userId));

export const changePassword = (userId, newPassword, signal) =>
  client.put(`${user(userId)}/change-password`, { newPassword }, { signal });

export const changeEmail = (userId, newEmail, signal) =>
  client.put(`${user(userId)}/change-email`, { newEmail }, { signal });

export const changeName = (userId, name, signal) =>
  client.put(`${user(userId)}/change-name`, { name }, { signal });

export const leaveOrganization = organization =>
  client.post(encodePath('api', 'user', 'leave', organization), {});

export const setPrimaryOrganization = organization =>
  client.put(encodePath('api', 'user', 'primary-organization', organization), {});

export const myRequests = () => client.get('/api/user/requests');

export const cancelRequest = requestId =>
  client.delete(encodePath('api', 'user', 'requests', requestId));

export const serviceAccounts = {
  create: (description, expirationDays, organizationId) =>
    client.post('/api/service-accounts/', { description, expirationDays, organizationId }),
  organizations: () => client.get('/api/service-accounts/organizations'),
  list: signal => client.get('/api/service-accounts/', { signal }),
  remove: id => client.delete(encodePath('api', 'service-accounts', id)),
};
