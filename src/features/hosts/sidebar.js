import { createElement, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGauge, FaGear, FaServer, FaSitemap } from 'react-icons/fa6';

import { useStatus } from '../../contexts/StatusContext';
import { authMethod, hasFeatureStrict } from '../../utils/capabilities';

import TreeDialogs from './components/TreeDialogs';
import { useHostStatsLoad, useHostStatsRevision } from './hooks/useHostStats';
import { useServers } from './hooks/useServers';
import { useTreeMenu } from './hooks/useTreeMenu';
import { configNamesOf, configNodes } from './utils/configNodes';
import { hostLabel, isRunning, isServerRole } from './utils/hosts';

const always = () => true;

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

const configNode = ({ status, server, t }) =>
  isServerRole(status) && configNamesOf(server).length > 0
    ? [
        {
          key: `config:${server.id}`,
          icon: FaGear,
          label: t('admin.config.title'),
          children: () => configNodes(status, server),
        },
      ]
    : [];

const hostNode = ({ status, server, load, revisionOf, turns, t }) => ({
  key: `host:${server.id}`,
  icon: FaServer,
  label: hostLabel(server),
  to: `/hosts/${server.id}`,
  revision: revisionOf(String(server.id)) + turns,
  server,
  ...(isServerRole(status) ? {} : { matches: always }),
  children: () =>
    machineNodes(load, server).then(machines => [
      ...machines,
      ...configNode({ status, server, t }),
    ]),
});

const datacenterNode = ({ status, hosts, listed, t }) => ({
  key: 'datacenter',
  icon: FaSitemap,
  label: status.datacenter_label || t('chrome.sidebarTree.datacenterDefault'),
  to: '/',
  datacenter: true,
  matches: always,
  revision: listed + hosts.reduce((sum, node) => sum + node.revision, 0),
  children: () => hosts,
});

const useTurns = value => {
  const [held, setHeld] = useState({ value, turns: 0 });
  if (held.value !== value) {
    setHeld({ value, turns: held.turns + 1 });
  }
  return held.turns;
};

const useHostTree = user => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const { servers } = useServers();
  const load = useHostStatsLoad();
  const revisionOf = useHostStatsRevision();
  const turns = useTurns(i18n.language);
  const listed = useTurns(servers);
  const { menu, target, close, run } = useTreeMenu(user);
  return useMemo(() => {
    const hosts = servers.map(server => hostNode({ status, server, load, revisionOf, turns, t }));
    return {
      nodes: isServerRole(status) ? [datacenterNode({ status, hosts, listed, t })] : hosts,
      menu,
      dialogs: createElement(TreeDialogs, { target, onClose: close, onRun: run }),
    };
  }, [status, servers, load, revisionOf, turns, listed, t, menu, target, close, run]);
};

/**
 * The hosts feature's sidebar export of the navbar contract's Sidebar
 * section, hyperweaver-ui's tree in its two modes: nothing unless the
 * host advertises `hosts` and, on a host that needs a session, a person
 * is signed in; else one Hosts group. On an agent role, hyperweaver-ui's
 * direct mode, the group's one section row is Dashboard at `/` (exact
 * match) and its tree the one serving agent's node, always open, its
 * children the machines alone. On the server role, hyperweaver-ui's
 * aggregated mode, the group has no section row and its tree's one root
 * is the Datacenter, hyperweaver-ui's root that is the Dashboard,
 * labelled by the status's `datacenter_label` or the default word,
 * routing to `/`, always open with every server of `useServers` listed
 * under it, its children asked for again when the list of servers or a
 * host's revision moved, and its right-click menu Open and, for a role
 * that may manage settings, Add host, opening the hosts page with the
 * registry panel's form open. A host's node routes to `/hosts/{id}` and draws no
 * status dot, hyperweaver-ui's host row; under it its machines from the
 * agent's stats, the copy `useHostStatsLoad` holds for the page and the
 * Controls menu, each routing to `/hosts/{id}/machines/{name}` with an
 * `up` dot while running, and then, on the server role for a row whose
 * `capabilities.config` names a file, one Configuration node folding to
 * one node per file of `configNodes`, each a deep link to
 * `/hosts/{id}/agent/config/<name>`. The host's node carries the copy's
 * `revision`, raised as well when the language changes, so the machines
 * and their dots follow a read after an action or a Refresh. The pages
 * of a host are no rows of the tree; they stay the column beside the
 * host's page and the page rows of the host node's right-click menu of
 * `useTreeMenu`, Open and the verbs the person's role and the host's
 * tokens allow, its dialogs the tree's `dialogs`.
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
  if (isServerRole(status)) {
    return [{ key: 'hosts', labelKey: 'hosts.sidebar.title', tree: useTree }];
  }
  return [
    {
      key: 'hosts',
      labelKey: 'hosts.sidebar.title',
      sections: [
        {
          key: 'hosts',
          items: [
            {
              key: 'dashboard',
              icon: FaGauge,
              labelKey: 'chrome.sidebar.dashboard',
              to: '/',
              end: true,
            },
          ],
        },
      ],
      tree: useTree,
    },
  ];
};
