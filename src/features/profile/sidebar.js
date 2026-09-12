import {
  FaBell,
  FaBuilding,
  FaDesktop,
  FaPlug,
  FaShieldHalved,
  FaSliders,
  FaStar,
  FaUser,
} from 'react-icons/fa6';

import { authMethod, hasFeature } from '../../utils/capabilities';

const PROFILE_CHILDREN = [
  {
    key: 'profile',
    icon: FaUser,
    labelKey: 'profile.tabs.profile',
    to: '/user/profile',
    end: true,
  },
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
 * Organizations while the host advertises `org-console`, Integrations
 * while `integrations` and Inbox while `inbox`, the Inbox row carrying the
 * `unread` badge the shell resolves; the Profile row carries `children`,
 * the five rows Profile (exact match), Security, Preferences, Favorites
 * and Sessions under `/user/profile`, each a deep link into the one page
 * (decision 109); nothing on any other host.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @returns {Array} The sidebar groups
 */
export const sidebar = (status, account) => {
  if (authMethod(status) !== 'cookie' || !account?.user) {
    return [];
  }
  const items = [
    {
      key: 'profile',
      icon: FaUser,
      labelKey: 'account.sidebar.profile',
      to: '/user/profile',
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
  if (hasFeature(status, 'integrations')) {
    items.push({
      key: 'integrations',
      icon: FaPlug,
      labelKey: 'account.sidebar.integrations',
      to: '/user/integrations',
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
  return [
    {
      key: 'account',
      labelKey: 'account.sidebar.title',
      sections: [{ key: 'account', labelKey: 'account.sidebar.title', items }],
    },
  ];
};
