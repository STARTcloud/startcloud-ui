import {
  FaBell,
  FaBuilding,
  FaDesktop,
  FaFileContract,
  FaKey,
  FaPuzzlePiece,
  FaShieldHalved,
  FaSliders,
  FaStar,
  FaUser,
} from 'react-icons/fa6';

import { authMethod, hasFeature } from '../../utils/capabilities';
import { guestOnly } from '../../utils/membership';
import { isGlobalAdmin } from '../../utils/permissions';
import { arrivalPath } from '../../utils/searchRow';

import { useIntegrationsTree } from './hooks/useIntegrationsTree';
import { sectionPath, sectionsFor } from './sections';

const SECTION_ICONS = {
  security: FaShieldHalved,
  preferences: FaSliders,
  favorites: FaStar,
  sessions: FaDesktop,
  organizations: FaBuilding,
  serviceAccounts: FaKey,
};

const profileRow = (basePath, profile, account) => ({
  key: 'profile',
  icon: FaUser,
  labelKey: 'account.sidebar.profile',
  to: basePath,
  end: true,
  children: sectionsFor(profile, account.organizations, isGlobalAdmin(account.user))
    .filter(section => section !== 'profile')
    .map(section => ({
      key: section,
      icon: SECTION_ICONS[section],
      labelKey: `profile.tabs.${section}`,
      to: sectionPath(basePath, section),
    })),
});

const group = (items, tree) => [
  {
    key: 'account',
    labelKey: 'account.sidebar.title',
    sections: [{ key: 'account', labelKey: 'account.sidebar.title', items }],
    ...(tree ? { tree } : {}),
  },
];

/**
 * The profile feature's sidebar groups for a signed-in person: one Account
 * group whose Profile row carries the sections `sectionsFor` offers, on a
 * `cookie` host also Organizations, Applications, Terms and policies,
 * Notifications and the Integrations tree by the host's tokens, the
 * Profile row alone for a guest-only account.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @param {{ list: Function }} integrations - The integrations adapter
 * @param {Object} profile - The host's `account` adapter of the profile page
 * @returns {Array} The sidebar groups
 */
export const sidebar = (status, account, integrations, profile) => {
  if (!account?.user) {
    return [];
  }
  const method = authMethod(status);
  if (method === 'backend' || method === 'apikey') {
    return group([profileRow('/profile', profile, account)]);
  }
  if (method !== 'cookie') {
    return [];
  }
  if (guestOnly(account.organizations)) {
    return group([profileRow('/user/profile', profile, account)]);
  }
  const items = [profileRow('/user/profile', profile, account)];
  if (hasFeature(status, 'org-console')) {
    items.push({
      key: 'organizations',
      icon: FaBuilding,
      labelKey: 'account.sidebar.organizations',
      to: '/user/organizations',
    });
  }
  items.push({
    key: 'applications',
    icon: FaPuzzlePiece,
    labelKey: 'account.sidebar.applications',
    to: '/user/applications',
  });
  if (hasFeature(status, 'policies')) {
    items.push({
      key: 'terms',
      icon: FaFileContract,
      labelKey: 'account.sidebar.terms',
      to: '/user/terms',
    });
  }
  if (hasFeature(status, 'inbox')) {
    items.push({
      key: 'inbox',
      icon: FaBell,
      labelKey: 'account.sidebar.notifications',
      to: '/notifications',
      badge: 'unread',
    });
  }
  const useTree = () => useIntegrationsTree(integrations);
  return group(items, hasFeature(status, 'integrations') ? useTree : null);
};

const organizationIcon = () => FaBuilding;

/**
 * The profile feature's search kinds on a `backend` host for a signed-in
 * person: organization, routed to the profile's Organizations section
 * with the query searched for as its `q`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @returns {Array<Object>} The kind entries
 */
export const searchKinds = (status, account) =>
  authMethod(status) === 'backend' && account?.user
    ? [
        {
          kind: 'organization',
          feature: 'profile',
          token: 'backend',
          locators: ['org'],
          route: (row, query) => arrivalPath(sectionPath('/profile', 'organizations'), row, query),
          icon: organizationIcon,
          labelKey: 'search.kinds.organization',
          matched: {},
          facets: [],
        },
      ]
    : [];
