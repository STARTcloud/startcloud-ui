import PropTypes from 'prop-types';
import { useState } from 'react';
import {
  FaArrowsRotate,
  FaBolt,
  FaBug,
  FaCirclePause,
  FaCirclePlay,
  FaDisplay,
  FaPause,
  FaPlay,
  FaPowerOff,
  FaRotate,
  FaSkull,
  FaStop,
  FaTerminal,
  FaTrash,
} from 'react-icons/fa6';

import { useHostActions } from '../hooks/useHostActions';
import { useMachineRow } from '../hooks/useHostMachines';
import { useHostStats } from '../hooks/useHostStats';
import { useMachineDetailRefresh } from '../hooks/useMachineDetail';
import { gatesOf } from '../utils/capabilities';
import { guestToolsOf } from '../utils/guestTools';
import { isRunning } from '../utils/hosts';
import { canDestroyMachines, canRestartMachines, canStartStopMachines } from '../utils/permissions';

import { useApplicationCommands } from './ApplicationRows';
import { useConsoleCommands } from './ConsoleRows';
import DisplayResizeModal from './DisplayResizeModal';
import GuestExecModal from './GuestExecModal';
import { PRIVILEGE_NOTE, useShareCommand } from './HostActionOptions';
import MachineDangerDialogs from './MachineDangerDialogs';
import { useMachineToolCommands } from './MachineToolRows';
import { useProvisioningCommands } from './ProvisioningRows';
import { useZoneCommands } from './ZoneRows';

const command = (key, group, icon, tone, labelKey, titleKey = '') => ({
  key,
  group,
  icon,
  tone,
  labelKey,
  titleKey,
});

const powerCommands = ({ role, running, gates }) => {
  if (!canStartStopMachines(role)) {
    return [];
  }
  const restart =
    running && canRestartMachines(role)
      ? [
          command('restart', 'power', FaRotate, 'text-warning', 'hosts.controls.restart'),
          ...(gates.utm
            ? []
            : [
                command(
                  'reset',
                  'power',
                  FaBolt,
                  'text-danger',
                  'hosts.controls.reset',
                  'hosts.controls.resetTitle'
                ),
              ]),
          command(
            'nmi',
            'power',
            FaBug,
            'text-danger',
            'hosts.controls.injectNmi',
            'hosts.controls.injectNmiTitle'
          ),
        ]
      : [];
  return [
    running
      ? command('shutdown', 'power', FaStop, 'text-danger', 'hosts.controls.shutdown')
      : command('start', 'power', FaPlay, 'text-success', 'hosts.controls.powerOn'),
    ...restart,
  ];
};

const holdCommands = ({ role, running, gates }) => {
  if (!canStartStopMachines(role)) {
    return [];
  }
  return [
    ...(running && gates.pause
      ? [
          command(
            'pause',
            'power',
            FaCirclePause,
            'text-warning',
            'hosts.controls.pause',
            'hosts.controls.pauseTitle'
          ),
        ]
      : []),
    ...(running && gates.suspend
      ? [
          command(
            'suspend',
            'power',
            FaPause,
            'text-warning',
            'hosts.controls.suspend',
            'hosts.controls.suspendTitle'
          ),
        ]
      : []),
    ...(gates.resume
      ? [
          command(
            'resume',
            'power',
            FaCirclePlay,
            'text-success',
            'hosts.controls.resume',
            'hosts.controls.resumeTitle'
          ),
        ]
      : []),
  ];
};

const guestCommands = ({ role, running, gates }) => {
  if (!running || !gates.guest || !canStartStopMachines(role)) {
    return [];
  }
  return [
    command(
      'guest-powerdown',
      'power',
      FaPowerOff,
      'text-danger',
      'hosts.controls.guestShutdown',
      'hosts.controls.guestShutdownTitle'
    ),
    ...(gates.utm
      ? []
      : [
          command(
            'guest-reboot',
            'power',
            FaArrowsRotate,
            'text-warning',
            'hosts.controls.guestReboot',
            'hosts.controls.guestRebootTitle'
          ),
        ]),
  ];
};

const guestToolCommands = tools => [
  ...(tools.exec
    ? [
        {
          ...command(
            'exec',
            'power',
            FaTerminal,
            'text-info',
            'hosts.controls.guestExec',
            'hosts.controls.guestExecTitle'
          ),
          action: 'guest-exec',
        },
      ]
    : []),
  ...(tools.display
    ? [
        {
          ...command(
            'display',
            'power',
            FaDisplay,
            'text-info',
            'hosts.controls.displayResize',
            'hosts.controls.displayResizeTitle'
          ),
          action: 'display-resize',
        },
      ]
    : []),
];

const dangerCommands = ({ role, running }) => {
  if (!canDestroyMachines(role)) {
    return [PRIVILEGE_NOTE];
  }
  return [
    ...(running
      ? [command('kill', 'danger', FaSkull, 'text-danger', 'hosts.controls.forceKill')]
      : []),
    command('destroy', 'danger', FaTrash, 'text-danger', 'hosts.controls.destroy'),
  ];
};

const GuestToolDialogs = ({ status, id, name, running, tool, utm, flavor, onClose }) => {
  if (tool === 'exec') {
    return (
      <GuestExecModal
        status={status}
        hostId={id}
        name={name}
        running={running}
        flavor={flavor}
        utm={utm}
        onClose={onClose}
      />
    );
  }
  if (tool === 'display') {
    return (
      <DisplayResizeModal
        status={status}
        hostId={id}
        name={name}
        running={running}
        onClose={onClose}
      />
    );
  }
  return null;
};

GuestToolDialogs.propTypes = {
  status: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  running: PropTypes.bool.isRequired,
  tool: PropTypes.string.isRequired,
  utm: PropTypes.bool.isRequired,
  flavor: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

const withRun = (commands, busy, runOf) =>
  commands.map(entry => (entry.note ? entry : { ...entry, disabled: busy, run: runOf(entry.key) }));

/**
 * The commands of the Controls menu on `/hosts/{id}/machines/{name}`:
 * Share link; Power on, Shutdown, Restart, Reset and Inject NMI, Pause,
 * Suspend and Resume, Guest shutdown and Guest reboot, Run in guest and
 * Set display size, each by the machine's state and the host's gates; the
 * console, application, tool, zone and provisioning commands; Force kill
 * and Destroy for a role that may destroy, the privilege line otherwise.
 * An action is one request through `useHostActions`, the host's stats,
 * machine rows and the machine's detail read again after a success.
 *
 * @param {Object} options
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {string} options.name - The machine's name
 * @param {Object|null} options.server - The host's registry row
 * @param {Object|null} options.user - The signed-in person
 * @param {boolean} options.wanted - Whether the menu or the search box is open, the reads of the application and provisioning commands waiting for it
 * @returns {{ commands: Array<Object>, dialogs: import('react').ReactNode }} The commands and their dialogs
 */
export const useMachineCommands = ({ status, id, name, server, user, wanted }) => {
  const role = user?.role;
  const { stats, refresh: refreshStats } = useHostStats(id);
  const { machine, refresh: refreshMachines } = useMachineRow(id, name);
  const refreshDetail = useMachineDetailRefresh();
  const refresh = () => {
    refreshStats();
    refreshMachines();
    refreshDetail(id, name);
  };
  const { run, busy } = useHostActions({ status, id, name, onDone: refresh });
  const [danger, setDanger] = useState('');
  const [tool, setTool] = useState('');
  const running = isRunning(stats, name);
  const gates = gatesOf({ server, machine });
  const guestTools = guestToolsOf({ server, machine, role, running });
  const share = useShareCommand();
  const consoles = useConsoleCommands({ id, name, server, busy });
  const applications = useApplicationCommands({
    id,
    busy,
    wanted,
    onLaunch: application => run('launch', { application }),
  });
  const tools = useMachineToolCommands({ status, id, name, server, machine, user, busy });
  const zones = useZoneCommands({ status, id, name, server, user, busy, onAction: run });
  const provisioning = useProvisioningCommands({ id, name, server, user, busy, wanted });
  const state = { role, running, gates };

  const commands = [
    share,
    ...withRun(
      [...powerCommands(state), ...holdCommands(state), ...guestCommands(state)],
      busy,
      key => () => run(key)
    ),
    ...withRun(guestToolCommands(guestTools), busy, key => () => setTool(key)),
    ...consoles,
    ...applications,
    ...tools.commands,
    ...zones.commands,
    ...provisioning,
    ...withRun(dangerCommands(state), busy, key => () => setDanger(key)),
  ];

  const dialogs = (
    <>
      {tools.dialogs}
      {zones.dialogs}
      <MachineDangerDialogs action={danger} name={name} onClose={() => setDanger('')} onRun={run} />
      <GuestToolDialogs
        status={status}
        id={id}
        name={name}
        running={running}
        tool={tool}
        utm={gates.utm}
        flavor={guestTools.flavor}
        onClose={() => setTool('')}
      />
    </>
  );

  return { commands, dialogs };
};
