import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const user = userId => encodePath('api', 'admin', 'users', userId);

const organization = organizationId => encodePath('api', 'admin', 'organizations', organizationId);

const rateLimitOf = userId => encodePath('api', 'admin', 'rate-limit', userId);

export const users = params => client.get('/api/admin/users', { params });

export const roles = () => client.get('/api/admin/roles');

export const updateUser = (userId, patch) => client.patch(user(userId), patch);

export const setRoles = (userId, roleNames) =>
  client.put(`${user(userId)}/roles`, { roles: roleNames });

export const deleteUser = userId => client.delete(user(userId));

export const bulk = body => client.post('/api/admin/users/bulk', body);

export const rateLimit = userId => client.get(rateLimitOf(userId));

export const unlockSignIn = userId => client.post(`${rateLimitOf(userId)}/unlock`, {});

export const unlockMethod = (userId, method) =>
  client.post(`${rateLimitOf(userId)}/tfa-unlock`, { method });

export const ban = userId => client.post(`${rateLimitOf(userId)}/ban`, {});

export const unban = userId => client.post(`${rateLimitOf(userId)}/unban`, {});

export const organizations = () => client.get('/api/admin/organizations');

export const updateOrganization = (organizationId, patch) =>
  client.patch(organization(organizationId), patch);

export const deleteOrganization = organizationId => client.delete(organization(organizationId));
