import {
  FaCertificate,
  FaCloud,
  FaCodeCompare,
  FaFileSignature,
  FaKey,
  FaLink,
  FaMagnifyingGlass,
  FaPuzzlePiece,
  FaRightLeft,
  FaRotate,
  FaShieldHalved,
  FaVault,
  FaWandMagicSparkles,
} from 'react-icons/fa6';

import { authMethod, hasFeatureStrict } from '../../utils/capabilities';

const VAULT_ROUTE = '/certs';

const KINDS = [
  { key: 'certificate', icon: FaCertificate, labelKey: 'certs.sidebar.certificates' },
  { key: 'authority', icon: FaShieldHalved, labelKey: 'certs.sidebar.authorities' },
  { key: 'request', icon: FaFileSignature, labelKey: 'certs.sidebar.requests' },
  { key: 'key', icon: FaKey, labelKey: 'certs.sidebar.keys' },
].map(kind => ({ ...kind, to: `${VAULT_ROUTE}?kind=${kind.key}` }));

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

const STORE = [
  { key: 'shared', icon: FaCloud, labelKey: 'certs.sidebar.shared', to: '/certs/shared' },
  { key: 'sync', icon: FaRotate, labelKey: 'certs.sidebar.sync', to: '/certs/sync' },
];

const toolsGroup = {
  key: 'tools',
  labelKey: 'certs.sidebar.tools',
  sections: [
    {
      key: 'tools',
      labelKey: 'certs.sidebar.tools',
      items: [
        {
          key: 'certs',
          icon: FaCertificate,
          labelKey: 'certs.sidebar.title',
          to: '/certs/convert',
          children: TOOLS,
        },
      ],
    },
  ],
};

/**
 * The certs feature's sidebar export of the navbar contract's Sidebar
 * section: nothing unless the host advertises `certs`; else a
 * Certificates group of one section under the CERTIFICATES heading, the
 * Vault row at `/certs` folding the Certificates, Authorities, Requests
 * and Keys rows, each the vault narrowed to that kind at
 * `/certs?kind=<kind>`, the one lit the kind the route carries, then the
 * Shared and Sync rows while the host advertises `certs-store` and a
 * person is signed in; and, while the host advertises `tools` as well,
 * the shared Tools group with one Certificates row opening Convert and
 * folding Convert, Decode, Match, Compare, Chain and Generate.
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
  const stored = hasFeatureStrict(status, 'certs-store') && signedIn;
  return [
    {
      key: 'certs',
      labelKey: 'certs.sidebar.title',
      sections: [
        {
          key: 'certs',
          labelKey: 'certs.sidebar.title',
          items: [VAULT, ...(stored ? STORE : [])],
        },
      ],
    },
    ...(hasFeatureStrict(status, 'tools') ? [toolsGroup] : []),
  ];
};
