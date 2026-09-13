import PropTypes from 'prop-types';

import { httpsUrl } from '../../../components/common/MethodList';
import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

import {
  approveRequest,
  createJoinRequest,
  denyRequest,
  discoverOrganizations,
  organizationRequests,
} from './organizations';

const ORGANIZATIONS = '/api/user/organizations';

const at = (uuid, ...segments) => `${ORGANIZATIONS}${encodePath(uuid, ...segments)}`;

export const listMemberships = () => client.get(ORGANIZATIONS);

export const createOrganization = name => client.post(ORGANIZATIONS, { name });

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

const directoryRow = row => ({
  id: row.uuid,
  name: row.uuid,
  display_name: row.name,
  description: row.description || '',
  logo: httpsUrl(row.logo_url),
  access_mode: row.access_mode,
  memberCount: row.member_count,
});

/**
 * The issuer's directory in the row shape the shared DiscoveryPage draws:
 * `GET /api/organizations/discover` answers `uuid`, `name`, `description`,
 * `logo_url`, `access_mode` and `member_count`, and the page keys a row by
 * `id`, sends its request to the organization under `name` (the uuid on
 * the issuer, the segment `/api/organization/{org}` takes), draws
 * `display_name` as the title, the logo only with the `https:` scheme,
 * and the count as `memberCount`.
 *
 * @returns {Promise<Array<Object>>} The discoverable organizations
 */
export const discoverIssuerOrganizations = () =>
  discoverOrganizations().then(rows => rows.map(directoryRow));

/**
 * The identity provider's own `organizations` adapter of the shared
 * organization console, the organizations page and the DiscoveryPage:
 * one read of every membership with the console's fields, the writes of
 * the identity contract's group 4 under `/api/user/organizations`, each
 * re-fetching the record afterward, and the directory routes of decision
 * 124 on BoxVault's paths, `discover` over `/api/organizations/discover`
 * and `join`, `requests`, `approveRequest` and `denyRequest` over
 * `/api/organization/{uuid}/requests`.
 */
export const issuerOrganizations = {
  list: listMemberships,
  create: createOrganization,
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
  discover: discoverIssuerOrganizations,
  join: createJoinRequest,
  requests: organizationRequests,
  approveRequest,
  denyRequest,
};

export const issuerOrganizationsShape = PropTypes.shape({
  list: PropTypes.func.isRequired,
  create: PropTypes.func.isRequired,
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
  discover: PropTypes.func.isRequired,
  join: PropTypes.func.isRequired,
  requests: PropTypes.func.isRequired,
  approveRequest: PropTypes.func.isRequired,
  denyRequest: PropTypes.func.isRequired,
});
