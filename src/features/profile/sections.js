import PropTypes from 'prop-types';

import { writesAny } from '../../utils/membership';

import { isReadOnly } from './components/ManageLink';

/**
 * The `account` adapter of the profile page, one shape for every host:
 * `profile` reads the current record; `mutability` is the SCIM word for
 * the record as a whole (RFC 7643 §2.2), `readWrite` where the host owns
 * the account and `readOnly` where an identity provider does, in which
 * case `manageUrl` is that provider's profile page and every section
 * draws its fields read-only with one Manage at identity provider link
 * in its heading; `stepUp` arms the step-up window where the host has
 * one; every other member is one group of calls the page draws a section
 * for and draws nothing without, the identity provider carrying
 * `details`, `address`, `phone` (`{ send, verify }`, the number changed
 * through a code), `email`, `password`, `tfa`, `passkeys`,
 * `backupCodes`, `linked`, `sessions`, `favorites`, `preferences` and
 * `deletion`, and a UI backend with accounts of its own carrying
 * `details`, `address`, `phone` (`{ set }`, the number written plainly),
 * `password`, `email`, `deletion`, `verification` (the emailed
 * verification link's consume and its resend), `organizations` and
 * `serviceAccounts`.
 */
export const accountShape = PropTypes.shape({
  profile: PropTypes.func.isRequired,
  mutability: PropTypes.oneOf(['readWrite', 'readOnly']).isRequired,
  manageUrl: PropTypes.string,
  stepUp: PropTypes.func,
  verification: PropTypes.shape({
    verify: PropTypes.func.isRequired,
    resend: PropTypes.func.isRequired,
  }),
  details: PropTypes.func,
  address: PropTypes.func,
  places: PropTypes.func,
  phone: PropTypes.object,
  email: PropTypes.object,
  password: PropTypes.func,
  tfa: PropTypes.object,
  passkeys: PropTypes.object,
  backupCodes: PropTypes.object,
  linked: PropTypes.object,
  sessions: PropTypes.object,
  favorites: PropTypes.object,
  preferences: PropTypes.func,
  deletion: PropTypes.func,
  organizations: PropTypes.shape({
    list: PropTypes.func.isRequired,
    leave: PropTypes.func.isRequired,
    setPrimary: PropTypes.func,
    requests: PropTypes.func.isRequired,
    cancelRequest: PropTypes.func.isRequired,
  }),
  serviceAccounts: PropTypes.shape({
    list: PropTypes.func.isRequired,
    organizations: PropTypes.func.isRequired,
    create: PropTypes.func.isRequired,
    remove: PropTypes.func.isRequired,
  }),
});

const SECURITY_MEMBERS = [
  'password',
  'email',
  'tfa',
  'passkeys',
  'backupCodes',
  'linked',
  'deletion',
];

/**
 * The profile sections by their route segment, the sidebar's Account rows
 * and the router reading the one table.
 */
export const PROFILE_ROUTE_SECTIONS = {
  '': 'profile',
  security: 'security',
  preferences: 'preferences',
  favorites: 'favorites',
  sessions: 'sessions',
  organizations: 'organizations',
  'service-accounts': 'serviceAccounts',
};

const SEGMENTS = Object.fromEntries(
  Object.entries(PROFILE_ROUTE_SECTIONS).map(([segment, section]) => [section, segment])
);

const OPTIONAL_SECTIONS = [
  'preferences',
  'favorites',
  'sessions',
  'organizations',
  'serviceAccounts',
];

const drawsSection = (account, section, memberships, admin) => {
  if (section === 'preferences' && isReadOnly(account)) {
    return true;
  }
  if (section === 'serviceAccounts') {
    return Boolean(account[section]) && writesAny(memberships, admin);
  }
  return Boolean(account[section]);
};

/**
 * The sections the profile page draws for an `account` adapter, in the
 * order the sidebar lists them: Profile always, Security while the
 * adapter carries any security call, then Preferences, Favorites,
 * Sessions, Organizations and Service accounts while it carries theirs;
 * a `readOnly` adapter draws Preferences whenever the record carries
 * `preferences`, because the read is the profile itself; Service accounts
 * only while one of the session's memberships holds a role beyond a
 * guest's or the viewer is a global admin, because a guest may not create
 * one.
 *
 * @param {Object} account - The `account` adapter
 * @param {Array<Object>} memberships - The session's organizations in the chrome's shape
 * @param {boolean} admin - Whether the viewer is a global admin
 * @returns {string[]} The section keys
 */
export const sectionsFor = (account, memberships, admin) => {
  const sections = ['profile'];
  if (SECURITY_MEMBERS.some(member => account[member])) {
    sections.push('security');
  }
  OPTIONAL_SECTIONS.forEach(section => {
    if (drawsSection(account, section, memberships, admin)) {
      sections.push(section);
    }
  });
  return sections;
};

/**
 * The route of one profile section under the host's profile path,
 * `/user/profile` on the identity provider and `/profile` on a UI backend
 * with accounts of its own.
 *
 * @param {string} basePath - The host's profile path
 * @param {string} section - A section key
 * @returns {string} The route
 */
export const sectionPath = (basePath, section) =>
  section === 'profile' ? basePath : `${basePath}/${SEGMENTS[section]}`;
