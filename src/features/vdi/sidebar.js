import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaCircle,
  FaCircleHalfStroke,
  FaCubes,
  FaLayerGroup,
  FaRegCircle,
  FaTableCells,
  FaUsers,
} from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import { authMethod, hasFeatureStrict } from '../../utils/capabilities';

import { fetchFleet, fetchPools } from './api/fleet';
import { vmHasNoSession, vmHasSession, vmKey } from './utils/vmStatus';

const SESSION_STATES = [
  { key: 'active', icon: FaCircle },
  { key: 'idle', icon: FaCircleHalfStroke },
  { key: 'no_session', icon: FaRegCircle },
];

const byHostname = (a, b) => a.hostname.localeCompare(b.hostname);

const sessionOf = vm => (vmHasNoSession(vm) ? 'no_session' : vm.user.session_state);

const vmNode = vm => ({
  key: vmKey(vm),
  label: vm.hostname,
  to: `/vm/${encodeURIComponent(vmKey(vm))}`,
  status: vmHasSession(vm) ? 'up' : 'idle',
});

const vmNodes = pick =>
  fetchFleet().then(data => (data.vms || []).filter(pick).sort(byHostname).map(vmNode));

const menuOf = navigate => node => [
  { key: 'open', labelKey: 'vdi.sidebar.open', onClick: () => navigate(node.to) },
];

const poolNodes = () =>
  fetchPools().then(answer =>
    Object.keys(answer.pools || {})
      .sort()
      .map(name => ({
        key: `pool:${name}`,
        icon: FaCubes,
        label: name,
        to: `/?pool=${encodeURIComponent(name)}`,
        children: () => vmNodes(vm => vm.uds?.pool_name === name),
      }))
  );

const usePoolTree = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return useMemo(
    () => ({
      nodes: [
        {
          key: 'pools',
          icon: FaLayerGroup,
          label: t('vdi.sidebar.pools'),
          to: '/',
          children: poolNodes,
        },
      ],
      menu: menuOf(navigate),
    }),
    [t, navigate]
  );
};

const useStateTree = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return useMemo(
    () => ({
      nodes: [
        {
          key: 'sessions',
          icon: FaUsers,
          label: t('vdi.sidebar.sessions'),
          to: '/',
          children: () =>
            SESSION_STATES.map(state => ({
              key: `session:${state.key}`,
              icon: state.icon,
              label: t(`vdi.session.${state.key}`),
              to: `/?session=${state.key}`,
              children: () => vmNodes(vm => sessionOf(vm) === state.key),
            })),
        },
      ],
      menu: menuOf(navigate),
    }),
    [t, navigate]
  );
};

/**
 * The vdi feature's sidebar export of the navbar contract's Sidebar
 * section: nothing unless the host advertises `fleet` and, on a host that
 * needs a session, a person is signed in; else one Fleet group with the
 * Fleet row at `/` (exact match) and a tree in two views, By pool (Pools →
 * one node per pool from `/api/vdi/pools` → its VMs from `/api/vdi/fleet`)
 * and By session state (Sessions → Active, Idle, No session → the VMs in
 * that state), every VM node routing to `/vm/{instance_id}` with an `up`
 * dot while it holds a session, and a right-click Open row on every node.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @returns {Array} The sidebar groups
 */
export const sidebar = (status, account) => {
  if (!hasFeatureStrict(status, 'fleet') || (authMethod(status) !== 'none' && !account?.user)) {
    return [];
  }
  return [
    {
      key: 'fleet',
      labelKey: 'vdi.sidebar.title',
      sections: [
        {
          key: 'fleet',
          items: [
            { key: 'fleet', icon: FaTableCells, labelKey: 'vdi.sidebar.fleet', to: '/', end: true },
          ],
        },
      ],
      views: [
        { key: 'pool', labelKey: 'vdi.sidebar.byPool', useTree: usePoolTree },
        { key: 'state', labelKey: 'vdi.sidebar.byState', useTree: useStateTree },
      ],
    },
  ];
};
