const MANAGER_ROLES = ['OWNER', 'ADMIN'];

/**
 * The membership of that name in the normalized organization list, null
 * when the list holds none.
 * @param {Array<{ name: string, roles?: string[] }>} organizations - The chrome's organization list
 * @param {string} name - The organization's route name
 * @returns {Object|null}
 */
export const membershipOf = (organizations, name) =>
  organizations.find(entry => entry.name === name) || null;

const hasRole = (organizations, name, roles) =>
  (membershipOf(organizations, name)?.roles || []).some(role => roles.includes(role));

/**
 * Whether the normalized organization list holds a membership of that name.
 * A guest counts: a guest is a membership, and the rows a membership may
 * read are the same rows.
 * @param {Array<{ name: string, roles?: string[] }>} organizations - The chrome's organization list
 * @param {string} name - The organization's route name
 * @returns {boolean}
 */
export const isMember = (organizations, name) => membershipOf(organizations, name) !== null;

/**
 * The read-only membership of the organization: a guest browses and
 * downloads what the organization holds and writes nothing.
 * @param {Array<{ name: string, roles?: string[] }>} organizations
 * @param {string} name
 * @returns {boolean}
 */
export const isGuest = (organizations, name) => hasRole(organizations, name, ['GUEST']);

/**
 * Owner or admin of the organization, or a global admin. Never a guest.
 * @param {Array<{ name: string, roles?: string[] }>} organizations
 * @param {string} name
 * @param {boolean} [admin] - Whether the viewer is a global admin
 * @returns {boolean}
 */
export const isManager = (organizations, name, admin = false) =>
  admin || hasRole(organizations, name, MANAGER_ROLES);

/**
 * Owner of the organization, or a global admin.
 * @param {Array<{ name: string, roles?: string[] }>} organizations
 * @param {string} name
 * @param {boolean} [admin] - Whether the viewer is a global admin
 * @returns {boolean}
 */
export const isOwner = (organizations, name, admin = false) =>
  admin || hasRole(organizations, name, ['OWNER']);

/**
 * Owner or admin of at least one organization, or a global admin: what a
 * page spanning organizations asks before it draws a select column.
 * @param {Array<{ name: string, roles?: string[] }>} organizations
 * @param {boolean} [admin] - Whether the viewer is a global admin
 * @returns {boolean}
 */
export const managesAny = (organizations, admin = false) =>
  admin ||
  organizations.some(entry => (entry.roles || []).some(role => MANAGER_ROLES.includes(role)));

/**
 * A role beyond a guest's in at least one organization, or a global admin:
 * what a page asks before it draws a control every member but a guest may
 * use.
 * @param {Array<{ name: string, roles?: string[] }>} organizations
 * @param {boolean} [admin] - Whether the viewer is a global admin
 * @returns {boolean}
 */
export const writesAny = (organizations, admin = false) =>
  admin || organizations.some(entry => (entry.roles || []).some(role => role !== 'GUEST'));
