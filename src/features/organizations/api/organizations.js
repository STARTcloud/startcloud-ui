import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const org = organization => encodePath('api', 'organization', organization);

export const organizationsWithUsers = () => client.get('/api/organizations-with-users');

export const organizationUsers = organization => client.get(`${org(organization)}/users`);

export const getOrganization = organization => client.get(org(organization));

export const updateOrganization = (organization, body) => client.put(org(organization), body);

export const suspendOrganization = organization => client.put(`${org(organization)}/suspend`, {});

export const resumeOrganization = organization => client.put(`${org(organization)}/resume`, {});

export const removeOrganization = organization => client.delete(org(organization));

export const discoverOrganizations = () => client.get('/api/organizations/discover');

export const setAccessMode = (organization, accessMode, defaultRole) =>
  client.put(`${org(organization)}/access-mode`, { accessMode, defaultRole });

export const setMemberRole = (organization, userId, role) =>
  client.put(`${org(organization)}${encodePath('users', userId)}/role`, { role });

export const removeMember = (organization, userId) =>
  client.delete(`${org(organization)}${encodePath('members', userId)}`);

export const joinAsAdmin = organization => client.post(`${org(organization)}/join`, {});

export const userOrganizations = () => client.get('/api/user/organizations');

export const createJoinRequest = (organization, message = null) =>
  client.post(`${org(organization)}/requests`, { message });

export const organizationRequests = organization => client.get(`${org(organization)}/requests`);

export const approveRequest = (organization, requestId, assignedRole = 'member') =>
  client.post(`${org(organization)}${encodePath('requests', requestId)}/approve`, {
    assignedRole,
  });

export const denyRequest = (organization, requestId) =>
  client.post(`${org(organization)}${encodePath('requests', requestId)}/deny`, {});
