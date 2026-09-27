import { useMemo } from 'react';
import { FaServer } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import { useStatus } from '../../contexts/StatusContext';
import { authMethod, hasFeatureStrict } from '../../utils/capabilities';

import { fetchStats } from './api/agents';
import { useServers } from './hooks/useServers';
import { hostLabel, isRunning, isServerRole } from './utils/hosts';

const menuOf = navigate => node => [
  { key: 'open', labelKey: 'hosts.sidebar.open', onClick: () => navigate(node.to) },
];

const machineNodes = (status, id) =>
  fetchStats(status, id).then(stats =>
    (stats.allmachines || []).sort().map(name => ({
      key: `machine:${id}:${name}`,
      label: name,
      to: `/hosts/${id}/machines/${encodeURIComponent(name)}`,
      status: isRunning(stats, name) ? 'up' : 'idle',
    }))
  );

const hostNode = (status, server) => ({
  key: `host:${server.id}`,
  icon: FaServer,
  label: hostLabel(server),
  to: `/hosts/${server.id}`,
  status: server.capabilities?.role === 'agent' || !isServerRole(status) ? 'up' : 'idle',
  children: () => machineNodes(status, server.id),
});

const useHostTree = () => {
  const status = useStatus();
  const navigate = useNavigate();
  const { servers } = useServers(status);
  return useMemo(
    () => ({
      nodes: servers.map(server => hostNode(status, server)),
      menu: menuOf(navigate),
    }),
    [status, servers, navigate]
  );
};

/**
 * The hosts feature's sidebar export of the navbar contract's Sidebar
 * section: nothing unless the host advertises `hosts` and, on a host that
 * needs a session, a person is signed in; else one Hosts group with the
 * Hosts row at `/` (exact match) and a tree of one node per server of
 * `useServers` (the registry on the server role, the one serving agent on
 * an agent role), each routing to `/hosts/{id}` with an `up` dot while the
 * row is an agent, its machines from the agent's stats under it, each
 * routing to `/hosts/{id}/machines/{name}` with an `up` dot while running,
 * and a right-click Open row on every node.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @returns {Array} The sidebar groups
 */
export const sidebar = (status, account) => {
  if (!hasFeatureStrict(status, 'hosts') || (authMethod(status) !== 'none' && !account?.user)) {
    return [];
  }
  return [
    {
      key: 'hosts',
      labelKey: 'hosts.sidebar.title',
      sections: [
        {
          key: 'hosts',
          items: [
            { key: 'hosts', icon: FaServer, labelKey: 'hosts.sidebar.hosts', to: '/', end: true },
          ],
        },
      ],
      tree: useHostTree,
    },
  ];
};
