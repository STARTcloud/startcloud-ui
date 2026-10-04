import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlay, FaRotate, FaStop } from 'react-icons/fa6';

import { machineNoun } from '../utils/hosts';
import { canRestartMachines, canStartStopMachines } from '../utils/permissions';

import BulkActionsDialog from './BulkActionsDialog';

const ROWS = [
  { action: 'start', icon: FaPlay, tone: 'text-success', allowed: canStartStopMachines },
  { action: 'stop', icon: FaStop, tone: 'text-danger', allowed: canStartStopMachines },
  { action: 'restart', icon: FaRotate, tone: 'text-warning', allowed: canRestartMachines },
];

/**
 * The bulk commands of the Controls menu, Start, Shut down and Restart
 * over the machines of the `servers` in scope, named by the noun their
 * hypervisors fix, each opening the bulk actions dialog; none for a role
 * that may not start or stop a machine.
 *
 * @param {Object} options
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {Array<Object>} options.servers - The hosts in scope
 * @param {string} options.scope - `host` or `all`
 * @param {Object|null} options.user - The signed-in person
 * @returns {{ commands: Array<Object>, dialogs: import('react').ReactNode }} The commands and their dialog
 */
export const useBulkCommands = ({ status, servers, scope, user }) => {
  const { t } = useTranslation();
  const role = user?.role;
  const [action, setAction] = useState('');
  const noun = machineNoun(servers);

  if (!canStartStopMachines(role)) {
    return { commands: [], dialogs: null };
  }

  return {
    commands: ROWS.filter(row => row.allowed(role)).map(row => ({
      key: `bulk-${row.action}`,
      group: 'bulk',
      header: scope === 'all' ? 'hosts.bulk.acrossAllHosts' : `hosts.bulk.header.${noun}`,
      icon: row.icon,
      tone: row.tone,
      labelKey: `hosts.bulk.${row.action}.${noun}`,
      run: () => setAction(row.action),
    })),
    dialogs: action ? (
      <BulkActionsDialog
        status={status}
        action={action}
        servers={servers}
        title={t(`hosts.bulk.title.${action}.${noun}`)}
        onHide={() => setAction('')}
      />
    ) : null,
  };
};
