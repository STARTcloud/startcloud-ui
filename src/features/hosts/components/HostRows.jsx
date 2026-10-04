import { useMemo, useState } from 'react';
import { FaEye, FaPlus, FaPowerOff, FaRotate } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import { useHostActions } from '../hooks/useHostActions';
import { useHostStats } from '../hooks/useHostStats';
import { HOST_PAGES, hostPagePath } from '../pages';
import { hostHasFeature } from '../utils/capabilities';
import { createRouteOf, hostCreates } from '../utils/machineCreate';
import { canControlHosts } from '../utils/permissions';

import { useBulkCommands } from './BulkRows';
import { PRIVILEGE_NOTE, useShareCommand } from './HostActionOptions';
import HostPowerDialogs from './HostPowerDialogs';

const [OVERVIEW] = HOST_PAGES.find(group => group.key === 'overview').pages;

/**
 * The commands of the Controls menu on a host's routes: Share link, View
 * host details and New machine while `hostCreates` offers it; Restart host
 * and Power off host while `powered`, each behind `HostPowerDialogs`, the
 * host's stats read again after a success; the bulk commands over this
 * host's machines while `bulk`; the privilege line for a role short of
 * controlling the host.
 *
 * @param {Object} options
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {boolean} options.powered - Whether the power commands draw
 * @param {boolean} options.bulk - Whether the bulk commands draw
 * @param {Object|null} options.server - The host's registry row
 * @param {Object|null} options.user - The signed-in person
 * @returns {{ commands: Array<Object>, dialogs: import('react').ReactNode }} The commands and their dialogs
 */
export const useHostCommands = ({ status, id, powered, bulk, server, user }) => {
  const role = user?.role;
  const navigate = useNavigate();
  const { refresh } = useHostStats(id);
  const { run, busy } = useHostActions({ status, id, name: '', onDone: refresh });
  const [action, setAction] = useState('');
  const servers = useMemo(() => (server ? [server] : []), [server]);
  const share = useShareCommand();
  const bulkCommands = useBulkCommands({ status, servers, scope: 'host', user });

  const commands = [
    share,
    {
      key: 'view-host',
      group: 'host',
      icon: FaEye,
      tone: 'text-info',
      labelKey: 'navbar.navbar.viewHostDetails',
      action: 'view-host',
      run: () => navigate(hostPagePath(id, OVERVIEW)),
    },
    ...(hostCreates(server, role)
      ? [
          {
            key: 'new-machine',
            group: 'host',
            icon: FaPlus,
            tone: 'text-success',
            labelKey: 'navbar.navbar.newMachine',
            action: 'new-machine',
            run: () => navigate(createRouteOf(id)),
          },
        ]
      : []),
    ...(powered
      ? [
          {
            key: 'host-restart',
            group: 'host-power',
            icon: FaRotate,
            tone: 'text-warning',
            labelKey: 'hosts.controls.restartHost',
            disabled: busy,
            run: () => setAction('host-restart'),
          },
          {
            key: 'host-shutdown',
            group: 'host-power',
            icon: FaPowerOff,
            tone: 'text-danger',
            labelKey: 'hosts.controls.powerOffHost',
            disabled: busy,
            run: () => setAction('host-shutdown'),
          },
        ]
      : []),
    ...(bulk ? bulkCommands.commands : []),
    ...(canControlHosts(role) ? [] : [PRIVILEGE_NOTE]),
  ];

  const dialogs = (
    <>
      <HostPowerDialogs
        action={action}
        fast={hostHasFeature(server, 'host-fast-reboot')}
        onClose={() => setAction('')}
        onRun={run}
      />
      {bulk ? bulkCommands.dialogs : null}
    </>
  );

  return { commands, dialogs };
};
