import { profileMemberships } from '../../../lib/backendSession';
import { isManager, isMember, isOwner } from '../../../utils/membership';

/** Whether the user holds the global admin role (matches App.jsx / backend isAdmin). */
export const isGlobalAdmin = user =>
  Boolean(user) && Array.isArray(user.roles) && user.roles.includes('ROLE_ADMIN');

/** Member of the organization (any role). Mirrors verifyOrgAccess.isOrgMember. */
export const isOrgMember = (user, organizationName) =>
  isMember(profileMemberships(user), organizationName);

/**
 * Org admin/owner, or a global admin.
 * Mirrors verifyOrgAccess.isOrgAdminOrOwner (which bypasses for global admins).
 * Used for org settings, member-role management, and bulk delete.
 */
export const isOrgManager = (user, organizationName) =>
  isManager(profileMemberships(user), organizationName, isGlobalAdmin(user));

/**
 * Org owner specifically, or a global admin.
 * Mirrors verifyOrgAccess.isOrgOwner (gates per-org role changes + org deletion).
 */
export const isOrgOwner = (user, organizationName) =>
  isOwner(profileMemberships(user), organizationName, isGlobalAdmin(user));

/**
 * Whether the user may mutate a box's content (edit/delete the box, and
 * create/update/delete its versions, providers, architectures, and files).
 * Mirrors the content controllers: box owner OR org admin/owner.
 * (The backend intentionally does not grant global admins content access, so
 * neither do we.)
 *
 * @param {object|null} user
 * @param {string} organizationName
 * @param {object|null} box - must include `userId` (the owner).
 */
export const canManageBox = (user, organizationName, box) => {
  if (!user) {
    return false;
  }
  if (box && box.userId === user.id) {
    return true;
  }
  return isManager(profileMemberships(user), organizationName);
};
