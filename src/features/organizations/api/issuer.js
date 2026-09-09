import PropTypes from 'prop-types';

import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const ORGANIZATIONS = '/api/user/organizations';

const at = (uuid, ...segments) => `${ORGANIZATIONS}${encodePath(uuid, ...segments)}`;

export const listMemberships = () => client.get(ORGANIZATIONS);

export const createOrganization = name => client.post(ORGANIZATIONS, { name });

export const joinOrganization = inviteCode =>
  client.post(`${ORGANIZATIONS}/join`, { invite_code: inviteCode });

export const patchOrganization = (uuid, body) => client.patch(at(uuid), body);

export const convertOrganization = (uuid, name) => client.post(at(uuid, 'convert'), { name });

export const regenerateInviteCode = uuid => client.post(at(uuid, 'invite-code'), {});

export const inviteMember = (uuid, email, role) =>
  client.post(at(uuid, 'invites'), { email, role });

export const revokeInvite = (uuid, inviteId) => client.delete(at(uuid, 'invites', inviteId));

export const setMembershipRole = (uuid, userId, role) =>
  client.put(at(uuid, 'members', userId, 'role'), { role });

export const removeMembership = (uuid, userId) => client.delete(at(uuid, 'members', userId));

export const leaveOrganization = uuid => client.post(at(uuid, 'leave'), {});

export const deleteOrganization = uuid => client.delete(at(uuid));

export const setPrimaryOrganization = uuid =>
  client.put('/api/user/primary-organization', { uuid });

/**
 * The identity provider's own `organizations` adapter of the shared
 * organization console and the organizations page: one read of every
 * membership with the console's fields, and the fourteen writes of the
 * identity contract's group 4 under `/api/user/organizations`, each
 * re-fetching the record afterward; it carries no `requests` and no
 * `discover`, so the console draws neither Join requests nor Discovery.
 */
export const issuerOrganizations = {
  list: listMemberships,
  create: createOrganization,
  join: joinOrganization,
  update: patchOrganization,
  convert: convertOrganization,
  regenerateInviteCode,
  invite: inviteMember,
  removeInvitation: revokeInvite,
  memberRole: setMembershipRole,
  removeMember: removeMembership,
  leave: leaveOrganization,
  remove: deleteOrganization,
  setPrimary: setPrimaryOrganization,
};

export const issuerOrganizationsShape = PropTypes.shape({
  list: PropTypes.func.isRequired,
  create: PropTypes.func.isRequired,
  join: PropTypes.func.isRequired,
  update: PropTypes.func.isRequired,
  convert: PropTypes.func.isRequired,
  regenerateInviteCode: PropTypes.func.isRequired,
  invite: PropTypes.func.isRequired,
  removeInvitation: PropTypes.func.isRequired,
  memberRole: PropTypes.func.isRequired,
  removeMember: PropTypes.func.isRequired,
  leave: PropTypes.func.isRequired,
  remove: PropTypes.func.isRequired,
  setPrimary: PropTypes.func.isRequired,
});
