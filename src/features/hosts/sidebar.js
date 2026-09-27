import { createElement, useMemo } from 'react';
import { FaServer } from 'react-icons/fa6';

import { useStatus } from '../../contexts/StatusContext';
import { authMethod, hasFeatureStrict } from '../../utils/capabilities';

import TreeDialogs from './components/TreeDialogs';
import { useHostStatsLoad, useHostStatsRevision } from './hooks/useHostStats';
import { useServers } from './hooks/useServers';
import { useTreeMenu } from './hooks/useTreeMenu';
import { hostLabel, isRunning, isServerRole } from './utils/hosts';

const machineNodes = (load, server) =>
  load(String(server.id)).then(stats =>
    [...(stats?.allmachines || [])].sort().map(name => ({
      key: `machine:${server.id}:${name}`,
      label: name,
      to: `/hosts/${server.id}/machines/${encodeURIComponent(name)}`,
      status: isRunning(stats, name) ? 'up' : 'idle',
      machine: { id: String(server.id), name, running: isRunning(stats, name) },
    }))
  );

const hostNode = ({ status, server, load, revisionOf }) => ({
  key: `host:${server.id}`,
  icon: FaServer,
  label: hostLabel(server),
  to: `/hosts/${server.id}`,
  status: server.capabilities?.role === 'agent' || !isServerRole(status) ? 'up' : 'idle',
  revision: revisionOf(String(server.id)),
  server,
  children: () => machineNodes(load, server),
});

const useHostTree = user => {
  const status = useStatus();
  const { servers } = useServers();
  const load = useHostStatsLoad();
  const revisionOf = useHostStatsRevision();
  const { menu, target, close, run } = useTreeMenu(user);
  return useMemo(
    () => ({
      nodes: servers.map(server => hostNode({ status, server, load, revisionOf })),
      menu,
      dialogs: createElement(TreeDialogs, { target, onClose: close, onRun: run }),
    }),
    [status, servers, load, revisionOf, menu, target, close, run]
  );
};

/**
 * The hosts feature's sidebar export of the navbar contract's Sidebar
 * section: nothing unless the host advertises `hosts` and, on a host that
 * needs a session, a person is signed in; else one Hosts group with the
 * Hosts row at `/` (exact match) and a tree of one node per server of
 * `useServers` (the registry on the server role, the one serving agent on
 * an agent role), each routing to `/hosts/{id}` with an `up` dot while the
 * row is an agent, its machines from the agent's stats under it, the
 * copy `useHostStatsLoad` holds for the page and the Controls menu, each
 * routing to `/hosts/{id}/machines/{name}` with an `up` dot while running,
 * the host's node carrying the copy's `revision` so the machines and
 * their dots follow a read after an action or a Refresh, and the
 * right-click menu of `useTreeMenu` on every node, Open and the verbs the
 * person's role and the host's tokens allow, its dialogs the tree's
 * `dialogs`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @returns {Array} The sidebar groups
 */
export const sidebar = (status, account) => {
  if (!hasFeatureStrict(status, 'hosts') || (authMethod(status) !== 'none' && !account?.user)) {
    return [];
  }
  const useTree = () => useHostTree(account?.user || null);
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
      tree: useTree,
    },
  ];
};
