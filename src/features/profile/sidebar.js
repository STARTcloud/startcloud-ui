import {
  FaBell,
  FaBuilding,
  FaDesktop,
  FaFileContract,
  FaPuzzlePiece,
  FaShieldHalved,
  FaSliders,
  FaStar,
  FaUser,
} from 'react-icons/fa6';

import { authMethod, hasFeature } from '../../utils/capabilities';

import { useIntegrationsTree } from './hooks/useIntegrationsTree';

const PROFILE_CHILDREN = [
  {
    key: 'security',
    icon: FaShieldHalved,
    labelKey: 'profile.tabs.security',
    to: '/user/profile/security',
  },
  {
    key: 'preferences',
    icon: FaSliders,
    labelKey: 'profile.tabs.preferences',
    to: '/user/profile/preferences',
  },
  {
    key: 'favorites',
    icon: FaStar,
    labelKey: 'profile.tabs.favorites',
    to: '/user/profile/favorites',
  },
  {
    key: 'sessions',
    icon: FaDesktop,
    labelKey: 'profile.tabs.sessions',
    to: '/user/profile/sessions',
  },
];

/**
 * The profile feature's sidebar export of the identity contract: for every
 * signed-in person on a `cookie` host one Account group with Profile,
 * Organizations while the host advertises `org-console`, Applications
 * always, Terms and policies while `policies`, Inbox while `inbox` (the
 * row carrying the `unread` badge the shell resolves) and, while the host
 * advertises `integrations`, the group's `tree` of decision 68 answering
 * the Integrations entry only once `GET /api/user/integrations`, read once
 * when the tree mounts through the integrations adapter the router hands
 * in, has answered `services`; the Profile row is the profile page itself
 * (`/user/profile`, active on its exact path alone) and carries
 * `children`, exactly Security, Preferences, Favorites and Sessions under
 * `/user/profile`, each a deep link into the one page (decision 109);
 * nothing on any other host.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @param {{ list: Function }} integrations - The integrations adapter
 * @returns {Array} The sidebar groups
 */
export const sidebar = (status, account, integrations) => {
  if (authMethod(status) !== 'cookie' || !account?.user) {
    return [];
  }
  const items = [
    {
      key: 'profile',
      icon: FaUser,
      labelKey: 'account.sidebar.profile',
      to: '/user/profile',
      end: true,
      children: PROFILE_CHILDREN,
    },
  ];
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
      labelKey: 'account.sidebar.inbox',
      to: '/notifications',
      badge: 'unread',
    });
  }
  const useTree = () => useIntegrationsTree(integrations);
  return [
    {
      key: 'account',
      labelKey: 'account.sidebar.title',
      sections: [{ key: 'account', labelKey: 'account.sidebar.title', items }],
      ...(hasFeature(status, 'integrations') ? { tree: useTree } : {}),
    },
  ];
};
