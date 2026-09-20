import { profileMemberships } from '../lib/backendSession';

import { hasFeature } from './capabilities';
import { isGuest, isManager, isMember, isOwner, managesAny } from './membership';

/**
 * Whether the user holds the global admin role, under `roles` or under
 * `authorities`, the one predicate every host and sidebar reads.
 * @param {object|null|undefined} user - The session's user
 * @returns {boolean}
 */
export const isGlobalAdmin = user =>
  Boolean(user?.roles?.includes('ROLE_ADMIN') || user?.authorities?.includes('ROLE_ADMIN'));

/** Member of the organization (any role). Mirrors verifyOrgAccess.isOrgMember. */
export const isOrgMember = (user, organizationName) =>
  isMember(profileMemberships(user), organizationName);

/**
 * The organization's read-only membership: a guest sees what a member
 * sees and every write control is absent for one.
 */
export const isOrgGuest = (user, organizationName) =>
  isGuest(profileMemberships(user), organizationName);

/**
 * Owner or admin of at least one organization, or a global admin: what a
 * listing spanning organizations asks before it draws its select column.
 */
export const managesAnyOrganization = user =>
  managesAny(profileMemberships(user), isGlobalAdmin(user));

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
 * @param {object|null} box - the raw box row, its `user_id` the owner.
 */
export const canManageBox = (user, organizationName, box) => {
  if (!user || isGuest(profileMemberships(user), organizationName)) {
    return false;
  }
  if (box && box.user_id === user.id) {
    return true;
  }
  return isManager(profileMemberships(user), organizationName);
};

/**
 * Whether the viewer may write to an item on this host: the host lists
 * `uploads` and the collection's own `canManage` says yes for the item;
 * the one test the item, version and provider pages make before they
 * draw bulk actions or hand a row-actions slot to the table, so an
 * actions column exists only where a cell can.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} collection - The collection definition
 * @param {Object|null} item - The loaded item
 * @param {object|null} user - The session's user
 * @returns {boolean}
 */
export const managesItem = (status, collection, item, user) =>
  hasFeature(status, 'uploads') &&
  Boolean(item && collection.canManage && collection.canManage(item, user));
