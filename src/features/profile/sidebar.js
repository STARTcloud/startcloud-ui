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

import { useIntegrationsTree } from './hooks/useIntegrationsTree';

const BACKEND_CHILDREN = ({ status, account }) => {
  const children = [];
  if (hasFeature(status, 'local-accounts') && !account?.oidc) {
    children.push({
      key: 'security',
      icon: FaShieldHalved,
      labelKey: 'profile.tabs.security',
      to: '/profile/security',
    });
  }
  children.push({
    key: 'organizations',
    icon: FaBuilding,
    labelKey: 'profile.tabs.organizations',
    to: '/profile/organizations',
  });
  children.push({
    key: 'serviceAccounts',
    icon: FaKey,
    labelKey: 'profile.tabs.serviceAccounts',
    to: '/profile/service-accounts',
  });
  return children;
};

const backendSidebar = (status, account) => [
  {
    key: 'account',
    labelKey: 'account.sidebar.title',
    sections: [
      {
        key: 'account',
        labelKey: 'account.sidebar.title',
        items: [
          {
            key: 'profile',
            icon: FaUser,
            labelKey: 'account.sidebar.profile',
            to: '/profile',
            end: true,
            children: BACKEND_CHILDREN({ status, account }),
          },
        ],
      },
    ],
  },
];

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
 * on a `backend` host the same Account group over that host's own profile
 * routes, Profile at `/profile` with Security (`/profile/security`, while
 * the host advertises `local-accounts` and the session is not the identity
 * provider's), Organizations (`/profile/organizations`) and Service
 * accounts (`/profile/service-accounts`) as its children, so one profile
 * shape serves both; nothing on any other host.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @param {{ list: Function }} integrations - The integrations adapter
 * @returns {Array} The sidebar groups
 */
export const sidebar = (status, account, integrations) => {
  if (!account?.user) {
    return [];
  }
  if (authMethod(status) === 'backend') {
    return backendSidebar(status, account);
  }
  if (authMethod(status) !== 'cookie') {
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
