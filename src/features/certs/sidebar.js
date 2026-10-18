import { createElement, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaArrowUpRightFromSquare,
  FaCertificate,
  FaCloud,
  FaCodeCompare,
  FaDownload,
  FaFileSignature,
  FaKey,
  FaLink,
  FaMagnifyingGlass,
  FaPuzzlePiece,
  FaRightLeft,
  FaRotate,
  FaShieldHalved,
  FaTrash,
  FaVault,
  FaWandMagicSparkles,
} from 'react-icons/fa6';
import { useLocation, useNavigate } from 'react-router-dom';

import { authMethod, hasFeatureStrict } from '../../utils/capabilities';

import VaultTreeDialogs from './components/VaultTreeDialogs';
import { useRecordActions } from './hooks/useRecordActions';
import { useVault } from './hooks/useVault';
import { focusOn } from './utils/focus';
import { nameOf, nowOf, recordPath, recordStatus } from './utils/records';

const VAULT_ROUTE = '/certs';

const VAULT_HEADING_ID = 'certs-vault-heading';

const TREE_KINDS = [
  { key: 'certificate', icon: FaCertificate, labelKey: 'certs.sidebar.certificates' },
  { key: 'authority', icon: FaShieldHalved, labelKey: 'certs.sidebar.authorities' },
  { key: 'request', icon: FaFileSignature, labelKey: 'certs.sidebar.requests' },
  { key: 'key', icon: FaKey, labelKey: 'certs.sidebar.keys' },
];

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

const DOTS = { valid: 'up', expiring: 'idle' };

const byName = (a, b) => nameOf(a).localeCompare(nameOf(b));

const recordNode = (record, now, thresholdDays) => {
  const dot = DOTS[recordStatus(record, now, thresholdDays)];
  return {
    key: `record:${record.id}`,
    label: nameOf(record),
    to: recordPath(record),
    record,
    ...(dot ? { status: dot } : {}),
  };
};

const kindNode = ({ kind, records, version, thresholdDays, t }) => {
  const own = records.filter(record => record.kind === kind.key);
  const children = () => {
    const now = nowOf();
    return [...own].sort(byName).map(record => recordNode(record, now, thresholdDays));
  };
  return {
    key: `kind:${kind.key}`,
    icon: kind.icon,
    label: t(kind.labelKey),
    revision: version,
    ...(own.length > 0 ? { children } : { disabled: true }),
  };
};

const menuOf =
  ({ navigate, actions, ask }) =>
  node => {
    if (!node.record) {
      return [];
    }
    return [
      {
        key: 'open',
        labelKey: 'certs.sidebar.open',
        icon: FaArrowUpRightFromSquare,
        onClick: () => navigate(node.to),
      },
      {
        key: 'convert',
        labelKey: 'certs.sidebar.convert',
        icon: FaRightLeft,
        tone: 'text-info',
        onClick: () => actions.convert(node.record),
      },
      {
        key: 'download',
        labelKey: 'certs.sidebar.download',
        icon: FaDownload,
        tone: 'text-info',
        onClick: () => actions.download(node.record),
      },
      { key: 'danger', divider: true },
      {
        key: 'delete',
        labelKey: 'certs.sidebar.delete',
        icon: FaTrash,
        tone: 'text-danger',
        onClick: () => ask(node.record),
      },
    ];
  };

const landOnVault = () => focusOn(VAULT_HEADING_ID);

const useKindTree = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const vault = useVault();
  const actions = useRecordActions();
  const [target, setTarget] = useState(null);
  const { records, version, preferences } = vault;
  const thresholdDays = preferences.threshold_days;
  const close = useCallback(() => setTarget(null), []);
  const removeTarget = useCallback(
    record => {
      actions.remove(record).then(() => {
        if (pathname !== VAULT_ROUTE) {
          navigate(VAULT_ROUTE, { state: { focusHeading: true } });
        }
      });
      setTarget(null);
    },
    [actions, navigate, pathname]
  );
  const menu = useMemo(() => menuOf({ navigate, actions, ask: setTarget }), [navigate, actions]);
  return useMemo(
    () => ({
      nodes: TREE_KINDS.map(kind => kindNode({ kind, records, version, thresholdDays, t })),
      menu,
      labelKey: 'certs.sidebar.byKind',
      dialogs: createElement(VaultTreeDialogs, {
        target,
        records,
        onClose: close,
        onRemove: removeTarget,
        onConfirmed: landOnVault,
      }),
    }),
    [records, version, thresholdDays, t, menu, target, close, removeTarget]
  );
};

const storeRows = [
  { key: 'shared', icon: FaCloud, labelKey: 'certs.sidebar.shared', to: '/certs/shared' },
  { key: 'sync', icon: FaRotate, labelKey: 'certs.sidebar.sync', to: '/certs/sync' },
];

/**
 * The certs feature's sidebar export of the navbar contract's Sidebar
 * section: nothing unless the host advertises `certs`; else one
 * Certificates group with a Certificates section holding the Vault row
 * at `/certs` (exact match) and the Shared and Sync rows while the host
 * advertises `certs-store` and a person is signed in, a Tools section
 * of Convert, Decode, Match, Compare, Chain and Generate, and the By
 * kind tree, whose Certificates, Authorities, Requests and Keys nodes
 * fold to the vault's records of that kind, a kind with none drawn as a
 * disabled row, each record routing to `/certs/{id}` with an `up` dot
 * while valid and an `idle` dot while expiring, the nodes' revision the
 * vault's version so every write re-reads them, and a right-click menu
 * of Open, Convert, Download and Delete on every record node, the
 * Delete's confirmation the tree's dialog, the browser's record alone
 * removed, the vault opened and its heading focused once the dialog has
 * gone.
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
          key: 'vault',
          labelKey: 'certs.sidebar.title',
          items: [
            {
              key: 'vault',
              icon: FaVault,
              labelKey: 'certs.sidebar.vault',
              to: '/certs',
              end: true,
            },
            ...(stored ? storeRows : []),
          ],
        },
        { key: 'tools', labelKey: 'certs.sidebar.tools', items: TOOLS },
      ],
      tree: useKindTree,
    },
  ];
};
