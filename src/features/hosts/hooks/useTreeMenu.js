import { useCallback, useState } from 'react';
import {
  FaArrowUpRightFromSquare,
  FaPlay,
  FaPowerOff,
  FaRotate,
  FaSkull,
  FaStop,
  FaTrash,
} from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import { useStatus } from '../../../contexts/StatusContext';
import { hostHasFeature } from '../utils/capabilities';
import {
  canDestroyMachines,
  canPowerOffHosts,
  canRestartMachines,
  canStartStopMachines,
} from '../utils/permissions';

import { useActionRunner } from './useHostActions';
import { useHostMachinesRefresh } from './useHostMachines';
import { useHostStatsRefresh } from './useHostStats';
import { useMachineDetailRefresh } from './useMachineDetail';

const NONE = { action: '', id: '', name: '' };

const divider = key => ({ key, divider: true });

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
 * answers a node's rows, Open on every node; on a machine's node Power
 * on while it is stopped, Shutdown and Restart while it runs, and for a
 * role that may destroy Force kill while it runs and Destroy; on a
 * host's node Restart host and Power off host while the role and the
 * host's `host-power` token allow them. A power row sends its one
 * request at once through `run`; a row that destroys or powers a host
 * off sets `target`, which the tree's dialogs open on, and the dialogs'
 * confirmation calls `run` with that target. After a success the host's
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
        return [
          open,
          ...powerRows({ machine, role, act: action => run({ ...aim, action }) }),
          ...dangerRows({ machine, role, ask: action => setTarget({ ...aim, action }) }),
        ];
      }
      const id = String(node.server.id);
      return [
        open,
        ...hostRows({
          server: node.server,
          role,
          ask: action => setTarget({ id, name: '', action }),
        }),
      ];
    },
    [navigate, role, run]
  );

  const close = useCallback(() => setTarget(NONE), []);

  return { menu, target, close, run };
};
