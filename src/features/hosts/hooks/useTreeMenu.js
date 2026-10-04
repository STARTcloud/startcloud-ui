import { useCallback, useState } from 'react';
import {
  FaArrowUpRightFromSquare,
  FaCamera,
  FaClone,
  FaGears,
  FaPlay,
  FaPlus,
  FaPowerOff,
  FaRotate,
  FaSkull,
  FaStop,
  FaTrash,
} from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import { useStatus } from '../../../contexts/StatusContext';
import { machinePagesFor } from '../machinePages';
import { hostPagesFor } from '../pages';
import { hostHasFeature } from '../utils/capabilities';
import { consoleDoorsOf, consoleRoute } from '../utils/consoles';
import { createRouteOf, hostCreates } from '../utils/machineCreate';
import { machineToolGates } from '../utils/machineTools';
import {
  canDestroyMachines,
  canManageSettings,
  canPowerOffHosts,
  canRestartMachines,
  canStartStopMachines,
} from '../utils/permissions';
import { provisioningGates, provisioningRoute } from '../utils/provisioning';

import { useActionRunner } from './useHostActions';
import { useHostMachinesRefresh } from './useHostMachines';
import { useHostStatsRefresh } from './useHostStats';
import { useMachineDetailRefresh } from './useMachineDetail';
import { useServers } from './useServers';

const NONE = { action: '', id: '', name: '' };

const TOOLS = [
  {
    key: 'snapshot',
    gate: 'snapshot',
    action: 'take',
    labelKey: 'navbar.navbar.snapshot',
    icon: FaCamera,
  },
  { key: 'clone', gate: 'clone', action: 'clone', labelKey: 'navbar.navbar.clone', icon: FaClone },
];

const divider = key => ({ key, divider: true });

const toolRows = ({ server, role, ask, provision }) => {
  const gates = machineToolGates({ server, machine: null, role });
  const rows = TOOLS.filter(tool => gates[tool.gate]).map(tool => ({
    key: tool.key,
    labelKey: tool.labelKey,
    icon: tool.icon,
    tone: 'text-info',
    onClick: () => ask(tool.action),
  }));
  if (provisioningGates({ server, role }).pipeline) {
    rows.push({
      key: 'provision',
      labelKey: 'navbar.navbar.provision',
      icon: FaGears,
      tone: 'text-warning',
      onClick: provision,
    });
  }
  return rows.length > 0 ? [divider('tools'), ...rows] : [];
};

const powerRows = ({ machine, role, act }) => {
  if (!canStartStopMachines(role)) {
    return [];
  }
  if (!machine.running) {
    return [
      divider('power'),
      {
        key: 'start',
        labelKey: 'hosts.controls.powerOn',
        icon: FaPlay,
        tone: 'text-success',
        onClick: () => act('start'),
      },
    ];
  }
  const restart = {
    key: 'restart',
    labelKey: 'hosts.controls.restart',
    icon: FaRotate,
    tone: 'text-warning',
    onClick: () => act('restart'),
  };
  return [
    divider('power'),
    {
      key: 'shutdown',
      labelKey: 'hosts.controls.shutdown',
      icon: FaStop,
      tone: 'text-danger',
      onClick: () => act('shutdown'),
    },
    ...(canRestartMachines(role) ? [restart] : []),
  ];
};

const dangerRows = ({ machine, role, ask }) => {
  if (!canDestroyMachines(role)) {
    return [];
  }
  const kill = {
    key: 'kill',
    labelKey: 'hosts.controls.forceKill',
    icon: FaSkull,
    tone: 'text-danger',
    onClick: () => ask('kill'),
  };
  return [
    divider('danger'),
    ...(machine.running ? [kill] : []),
    {
      key: 'destroy',
      labelKey: 'hosts.controls.destroy',
      icon: FaTrash,
      tone: 'text-danger',
      onClick: () => ask('destroy'),
    },
  ];
};

const consoleRows = ({ server, aim, navigate }) => {
  const rows = consoleDoorsOf(server).map(door => ({
    key: `console-${door.key}`,
    labelKey: door.labelKey,
    icon: door.icon,
    tone: 'text-info',
    onClick: () => navigate(consoleRoute(aim.id, aim.name, door.key)),
  }));
  return rows.length > 0 ? [divider('consoles'), ...rows] : [];
};

const settingsRows = ({ server, role, aim, navigate }) =>
  machinePagesFor({ server, id: aim.id, name: aim.name, role })
    .filter(page => page.key === 'settings')
    .map(page => ({
      key: page.key,
      labelKey: page.labelKey,
      icon: page.icon,
      onClick: () => navigate(page.to),
    }));

const pageRows = ({ server, id, navigate }) => [
  divider('pages'),
  ...hostPagesFor(server, id)
    .flatMap(group => group.pages)
    .filter(page => page.labelKey)
    .map(page => ({
      key: page.key,
      labelKey: page.labelKey,
      icon: page.icon,
      onClick: () => navigate(page.to),
    })),
];

const createRows = ({ server, role, create }) =>
  hostCreates(server, role)
    ? [
        divider('create'),
        {
          key: 'new-machine',
          labelKey: 'navbar.navbar.newMachine',
          icon: FaPlus,
          tone: 'text-success',
          onClick: create,
        },
      ]
    : [];

const ADD_HOST = '/?add=host';

const addHostRows = ({ role, navigate }) =>
  canManageSettings(role)
    ? [
        divider('add-host'),
        {
          key: 'add-host',
          labelKey: 'chrome.sidebarTree.addHostButton',
          icon: FaPlus,
          tone: 'text-success',
          onClick: () => navigate(ADD_HOST),
        },
      ]
    : [];

const hostRows = ({ server, role, ask }) => {
  if (!canPowerOffHosts(role) || !hostHasFeature(server, 'host-power')) {
    return [];
  }
  return [
    divider('power'),
    {
      key: 'host-restart',
      labelKey: 'hosts.controls.restartHost',
      icon: FaRotate,
      tone: 'text-warning',
      onClick: () => ask('host-restart'),
    },
    {
      key: 'host-shutdown',
      labelKey: 'hosts.controls.powerOffHost',
      icon: FaPowerOff,
      tone: 'text-danger',
      onClick: () => ask('host-shutdown'),
    },
  ];
};

/**
 * The right-click menu of the hosts tree and what its rows need: `menu`
 * answers a node's rows, Open on every node; on a machine's node
 * Settings while `MACHINE_PAGES` offers the page, opening it, Power
 * on while it is stopped, Shutdown and Restart while it runs, one row a
 * console the host's row lists, hyperweaver-ui's VNC console and zlogin
 * console rows with SSH and RDP beside them, each opening the console on
 * the machine's page, Snapshot
 * and Clone while `machineToolGates` offers them for the host's own row
 * and the person's role, Provision while `provisioningGates` offers the
 * pipeline, the host listing `provisioning`, opening the machine's
 * Provisioning page with the provision in `run`, and for a
 * role that may destroy Force kill while it runs and Destroy; on a
 * host's node one row a page the host's own row offers, from the one
 * list of `HOST_PAGES`, hyperweaver-ui's doors, each opening its page,
 * the one place the tree offers the pages since it lists none as rows,
 * New machine while `hostCreates` offers it, opening the create wizard
 * on the host's page, and Restart host and Power off host while the role and the
 * host's `host-power` token allow them; on the Datacenter root Open and,
 * for a role that may manage settings, Add host, hyperweaver-ui's
 * affordance beside its root, opening the hosts page with the registry
 * panel's form open at `/?add=host`; on a configuration file's
 * node Open alone, and no menu on a node without a route, the
 * Configuration node. A power row sends its one
 * request at once through `run`; a row that destroys, powers a host
 * off, takes a snapshot or clones sets `target`, which the tree's
 * dialogs open on, and the confirmation of a dialog that destroys or
 * powers off calls `run` with that target. After a success the host's
 * stats are read again once, and its machine rows and the machine's
 * detail while they are held.
 *
 * @param {Object|null} user - The session's user
 * @returns {{ menu: Function, target: Object, close: Function, run: Function }} The menu and its state
 */
export const useTreeMenu = user => {
  const status = useStatus();
  const navigate = useNavigate();
  const { run: send } = useActionRunner(status);
  const refreshStats = useHostStatsRefresh();
  const refreshMachines = useHostMachinesRefresh();
  const refreshDetail = useMachineDetailRefresh();
  const { held } = useServers();
  const [target, setTarget] = useState(NONE);
  const role = user?.role;

  const run = useCallback(
    ({ id, name, action, options }) =>
      send({
        id,
        name,
        action,
        options,
        onDone: () => {
          refreshStats(id);
          refreshMachines(id);
          if (name) {
            refreshDetail(id, name);
          }
        },
      }),
    [send, refreshStats, refreshMachines, refreshDetail]
  );

  const menu = useCallback(
    node => {
      const open = {
        key: 'open',
        labelKey: 'hosts.sidebar.open',
        icon: FaArrowUpRightFromSquare,
        onClick: () => navigate(node.to),
      };
      if (node.machine) {
        const { machine } = node;
        const aim = { id: machine.id, name: machine.name };
        const server = held.find(row => String(row.id) === machine.id) || null;
        const ask = action => setTarget({ ...aim, action });
        return [
          open,
          ...settingsRows({ server, role, aim, navigate }),
          ...powerRows({ machine, role, act: action => run({ ...aim, action }) }),
          ...consoleRows({ server, aim, navigate }),
          ...toolRows({
            server,
            role,
            ask,
            provision: () => navigate(provisioningRoute(aim.id, aim.name, 'provision')),
          }),
          ...dangerRows({ machine, role, ask }),
        ];
      }
      if (node.datacenter) {
        return [open, ...addHostRows({ role, navigate })];
      }
      if (!node.server) {
        return node.to ? [open] : [];
      }
      const id = String(node.server.id);
      return [
        open,
        ...pageRows({ server: node.server, id, navigate }),
        ...createRows({
          server: node.server,
          role,
          create: () => navigate(createRouteOf(id)),
        }),
        ...hostRows({
          server: node.server,
          role,
          ask: action => setTarget({ id, name: '', action }),
        }),
      ];
    },
    [navigate, role, run, held]
  );

  const close = useCallback(() => setTarget(NONE), []);

  return { menu, target, close, run };
};
