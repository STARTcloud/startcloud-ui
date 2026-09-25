import { lazy } from 'react';

export {
  convertOrganization,
  createOrganization,
  deleteOrganization,
  discoverIssuerOrganizations,
  inviteMember,
  issuerOrganizations,
  issuerOrganizationsShape,
  leaveOrganization,
  listMemberships,
  patchOrganization,
  regenerateInviteCode,
  removeMembership,
  revokeInvite,
  setMembershipRole,
  setPrimaryOrganization as setPrimaryMembership,
} from './api/issuer';
export {
  approveRequest,
  createJoinRequest,
  denyRequest,
  discoverOrganizations,
  organizationRequests,
  organizationUsers,
  organizationsWithUsers,
  removeMember,
  removeOrganization,
  resumeOrganization,
  setAccessMode,
  setMemberRole,
  suspendOrganization,
  updateOrganization,
} from './api/organizations';
export { ORG_CONSOLE_SEGMENTS } from './segments';

export const DiscoveryPage = lazy(() => import('./components/DiscoveryPage'));
export const OrgConsolePage = lazy(() => import('./components/OrgConsolePage'));
export const OrganizationsPage = lazy(() => import('./components/OrganizationsPage'));
