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

import { sectionPath, sectionsFor } from './components/ProfilePage';
import { useIntegrationsTree } from './hooks/useIntegrationsTree';

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
 * The profile feature's sidebar export of the identity contract: for every
 * signed-in person one Account group whose Profile row is the profile page
 * itself, active on its exact path alone, carrying `children` built from
 * `sectionsFor` over the host's `profile` adapter, the account's
 * `organizations` and its global-admin role, and the host's profile
 * path (`/user/profile` on a `cookie` host, `/profile` on a `backend`
 * host), so the column never lists a section the page cannot draw
 * (decision 109); on a `cookie` host the group also carries Organizations
 * while the host advertises `org-console`, Applications always, Terms and
 * policies while `policies`, Notifications while `inbox` (the row to the
 * inbox page, carrying the `unread` badge the shell resolves) and, while
 * the host advertises
 * `integrations`, the group's `tree` of decision 68 answering the
 * Integrations entry only once `GET /api/user/integrations`, read once
 * when the tree mounts through the integrations adapter the router hands
 * in, has answered `services`; for a guest-only account (`guestOnly`,
 * the shared download login) the group is the Profile row alone;
 * nothing on any other host.
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
  if (method === 'backend') {
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
