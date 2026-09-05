import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const PUBLIC = { auth: false };

export const validateInvitation = token =>
  client.get(encodePath('api', 'auth', 'validate-invitation', token), PUBLIC);

export const acceptInvitation = token =>
  client.post(`${encodePath('api', 'auth', 'invitations', token)}/accept`, {});

export const invite = body => client.post('/api/auth/invite', body);

export const activeInvitations = organization =>
  client.get(encodePath('api', 'invitations', 'active', organization));

export const removeInvitation = invitationId =>
  client.delete(encodePath('api', 'invitations', invitationId));
