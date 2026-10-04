import {
  FaBan,
  FaBell,
  FaBuilding,
  FaDesktop,
  FaFileContract,
  FaIdBadge,
  FaRightToBracket,
  FaUser,
  FaUserPlus,
  FaWindowMaximize,
} from 'react-icons/fa6';

import { authMethod } from '../../utils/capabilities';
import { isGlobalAdmin } from '../../utils/permissions';
import { arrivalPath } from '../../utils/searchRow';

/**
 * The operator pages by the route segment that names each.
 */
export const IDENTITY_ADMIN_PAGES = [
  'dashboard',
  'users',
  'organizations',
  'logins',
  'registrations',
  'sessions',
  'service-usage',
  'insights',
  'client-health',
  'provider-health',
  'brute-force',
  'terms',
  'email-templates',
];

export const IDENTITY_RECORD_PAGES = ['user'];

const listed = path => (row, query) => arrivalPath(path, row, query);

const configItem = (file, name) => `/admin/config/${file}#${encodeURIComponent(name)}`;

const KINDS = [
  {
    kind: 'organization',
    icon: FaBuilding,
    locators: ['org'],
    route: admin => listed(admin ? '/admin/organizations' : '/user/organizations'),
  },
  {
    kind: 'user',
    icon: FaUser,
    locators: ['name'],
    route: () => listed('/admin/users'),
  },
  {
    kind: 'application',
    icon: FaWindowMaximize,
    locators: ['name'],
    route: admin => (row, query) =>
      admin ? configItem('clients', row.name) : arrivalPath('/user/applications', row, query),
  },
  {
    kind: 'identity-provider',
    icon: FaIdBadge,
    locators: ['name'],
    route: admin => row => (admin ? configItem('providers', row.name) : '/user/profile/security'),
  },
  {
    kind: 'terms',
    icon: FaFileContract,
    locators: ['name'],
    route: admin => (row, query) =>
      admin
        ? arrivalPath('/admin/terms', row, query)
        : `/public/policies/${encodeURIComponent(row.name)}`,
  },
  { kind: 'notification', icon: FaBell, locators: ['id'], route: () => listed('/notifications') },
  {
    kind: 'session',
    icon: FaDesktop,
    locators: ['id'],
    route: admin => listed(admin ? '/admin/sessions' : '/user/profile/sessions'),
  },
  {
    kind: 'login',
    icon: FaRightToBracket,
    locators: ['name'],
    route: () => listed('/admin/logins'),
  },
  {
    kind: 'registration',
    icon: FaUserPlus,
    locators: ['name'],
    route: () => listed('/admin/registrations'),
  },
  {
    kind: 'blocked-address',
    icon: FaBan,
    locators: ['name'],
    route: () => listed('/admin/brute-force'),
  },
];

/**
 * The identity feature's search kinds on a `cookie` host, each routed to
 * the page that lists it, the operator's page for a global admin, with
 * the query searched for as the page's `q`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @returns {Array<Object>} The kind entries
 */
export const searchKinds = (status, account) => {
  if (authMethod(status) !== 'cookie') {
    return [];
  }
  const admin = isGlobalAdmin(account?.user);
  return KINDS.map(({ kind, icon, locators, route }) => ({
    kind,
    feature: 'identity',
    token: 'cookie',
    locators,
    route: route(admin),
    icon: () => icon,
    labelKey: `search.kinds.${kind}`,
    matched: {},
    facets: [],
  }));
};
