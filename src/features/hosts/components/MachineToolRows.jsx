import { useState } from 'react';
import { FaBoxArchive, FaCamera, FaClone, FaCompactDisc, FaTruckArrowRight } from 'react-icons/fa6';

import { machineToolGates } from '../utils/machineTools';

import MachineToolDialogs from './MachineToolDialogs';

const ROWS = [
  {
    tool: 'take',
    gate: 'snapshot',
    icon: FaCamera,
    tone: 'text-info',
    labelKey: 'navbar.navbar.snapshot',
    titleKey: 'hosts.tools.snapshotTitle',
  },
  {
    tool: 'clone',
    gate: 'clone',
    icon: FaClone,
    tone: 'text-info',
    labelKey: 'navbar.navbar.clone',
    titleKey: 'hosts.tools.cloneTitle',
  },
  {
    tool: 'template',
    gate: 'templates',
    icon: FaBoxArchive,
    tone: 'text-info',
    labelKey: 'navbar.navbar.convertToTemplate',
    titleKey: 'navbar.navbar.convertToTemplateTitle',
  },
  {
    tool: 'install',
    gate: 'install',
    icon: FaCompactDisc,
    tone: 'text-info',
    labelKey: 'navbar.navbar.installOs',
    titleKey: 'navbar.navbar.installOsTitle',
  },
  {
    tool: 'move',
    gate: 'move',
    icon: FaTruckArrowRight,
    tone: 'text-warning',
    labelKey: 'navbar.navbar.move',
    titleKey: 'navbar.navbar.moveTitle',
  },
];

/**
 * The tool commands of the machine Controls menu, Snapshot, Clone,
 * Convert to template, Install OS and Move, each while `machineToolGates`
 * offers it, each opening its dialog of `MachineToolDialogs`.
 *
 * @param {Object} options
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {string} options.name - The machine's name
 * @param {Object|null} options.server - The host's registry row
 * @param {Object|null} options.machine - The machine's own row
 * @param {Object|null} options.user - The signed-in person
 * @param {boolean} options.busy - Whether an action is in flight
 * @returns {{ commands: Array<Object>, dialogs: import('react').ReactNode }} The commands and their dialogs
 */
export const useMachineToolCommands = ({ status, id, name, server, machine, user, busy }) => {
  const [tool, setTool] = useState('');
  const gates = machineToolGates({ server, machine, role: user?.role });
  return {
    commands: ROWS.filter(row => gates[row.gate]).map(row => ({
      key: `tool-${row.tool}`,
      group: 'tools',
      icon: row.icon,
      tone: row.tone,
      labelKey: row.labelKey,
      titleKey: row.titleKey,
      action: `tool-${row.tool}`,
      disabled: busy,
      run: () => setTool(row.tool),
    })),
    dialogs: (
      <MachineToolDialogs
        status={status}
        tool={tool}
        id={id}
        name={name}
        onClose={() => setTool('')}
      />
    ),
  };
};
