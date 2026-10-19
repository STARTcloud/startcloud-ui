import {
  FaCertificate,
  FaCodeCompare,
  FaFileSignature,
  FaKey,
  FaLink,
  FaMagnifyingGlass,
  FaPuzzlePiece,
  FaRightLeft,
  FaShieldHalved,
  FaUserSecret,
  FaVault,
  FaWandMagicSparkles,
} from 'react-icons/fa6';

import { authMethod, hasFeatureStrict } from '../../utils/capabilities';

import { SECRET_KINDS } from './utils/records';

const VAULT_ROUTE = '/certs';

const AGENT_ROLES = ['hyperweaver-agent', 'zoneweaver-agent'];

/**
 * The route of the vault narrowed to the secret kinds, every one of them
 * under the one `kind` filter.
 */
export const SECRETS_ROUTE = `${VAULT_ROUTE}?kind=${SECRET_KINDS.join(',')}`;

/**
 * The route of the backend's Certificates store.
 */
export const STORE_ROUTE = '/certs/shared';

const KINDS = [
  { key: 'certificate', icon: FaCertificate, labelKey: 'certs.sidebar.certificates' },
  { key: 'authority', icon: FaShieldHalved, labelKey: 'certs.sidebar.authorities' },
  { key: 'request', icon: FaFileSignature, labelKey: 'certs.sidebar.requests' },
  { key: 'key', icon: FaKey, labelKey: 'certs.sidebar.keys' },
]
  .map(kind => ({ ...kind, to: `${VAULT_ROUTE}?kind=${kind.key}` }))
  .concat([
    { key: 'secrets', icon: FaUserSecret, labelKey: 'certs.sidebar.secrets', to: SECRETS_ROUTE },
  ]);

const TOOLS = [
  { key: 'convert', icon: FaRightLeft, labelKey: 'certs.sidebar.convert', to: '/certs/convert' },
  { key: 'decode', icon: FaMagnifyingGlass, labelKey: 'certs.sidebar.decode', to: '/certs/decode' },
  { key: 'match', icon: FaPuzzlePiece, labelKey: 'certs.sidebar.match', to: '/certs/match' },
  { key: 'compare', icon: FaCodeCompare, labelKey: 'certs.sidebar.compare', to: '/certs/compare' },
  { key: 'chain', icon: FaLink, labelKey: 'certs.sidebar.chain', to: '/certs/chain' },
  {
    key: 'generate',
    icon: FaWandMagicSparkles,
    labelKey: 'certs.sidebar.generate',
    to: '/certs/generate',
  },
];

const VAULT = {
  key: 'vault',
  icon: FaVault,
  labelKey: 'certs.sidebar.vault',
  to: VAULT_ROUTE,
  end: true,
  children: KINDS,
};

const STORE = {
  key: 'certs-store',
  icon: FaCertificate,
  labelKey: 'certs.sidebar.shared',
  to: STORE_ROUTE,
};

const TOOLS_ROW = {
  key: 'certs',
  icon: FaCertificate,
  labelKey: 'certs.sidebar.title',
  to: '/certs/convert',
  children: TOOLS,
};

const accountGroup = {
  key: 'account',
  labelKey: 'account.sidebar.title',
  sections: [{ key: 'account', labelKey: 'account.sidebar.title', items: [VAULT] }],
};

const browseGroup = {
  key: 'browse',
  labelKey: 'pages.sidebar.browse',
  sections: [{ key: 'browse', labelKey: 'pages.sidebar.browse', items: [STORE] }],
};

const adminGroup = {
  key: 'admin',
  labelKey: 'admin.sidebar.title',
  sections: [{ key: 'system', labelKey: 'admin.sidebar.system', items: [TOOLS_ROW] }],
};

/**
 * The certs feature's sidebar export of the navbar contract's Sidebar
 * section, nothing unless the host advertises `certs`: while a person is
 * signed in, the Vault row at `/certs` in the Account group, folding the
 * Certificates, Authorities, Requests and Keys rows, each the vault
 * narrowed to that kind at `/certs?kind=<kind>`, and the Secrets row, the
 * vault narrowed to the eight secret kinds, the one lit the kind the
 * route carries; while the host advertises `certs-store` as well and is
 * no agent role, the Certificates row of the backend's store at
 * `/certs/shared` in the Browse group; and while the host advertises
 * `tools`, the Certificates row opening Convert and folding Convert,
 * Decode, Match, Compare, Chain and Generate in the Admin group's System
 * section.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @returns {Array} The sidebar groups
 */
export const sidebar = (status, account) => {
  if (!hasFeatureStrict(status, 'certs')) {
    return [];
  }
  const signedIn = authMethod(status) === 'none' || Boolean(account?.user);
  const browsed =
    signedIn && hasFeatureStrict(status, 'certs-store') && !AGENT_ROLES.includes(status.role);
  return [
    ...(signedIn ? [accountGroup] : []),
    ...(browsed ? [browseGroup] : []),
    ...(hasFeatureStrict(status, 'tools') ? [adminGroup] : []),
  ];
};
