import { FaGears, FaListCheck, FaRotate, FaRotateLeft } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import { useMachineDetail } from '../hooks/useMachineDetail';
import { provisioningGates, provisioningRoute } from '../utils/provisioning';

const ROWS = [
  {
    run: 'provision',
    icon: FaGears,
    tone: 'text-warning',
    labelKey: 'navbar.navbar.provision',
    titleKey: 'navbar.navbar.provisionTitle',
  },
  {
    run: 'sync',
    icon: FaRotate,
    tone: 'text-info',
    labelKey: 'navbar.navbar.syncFiles',
    titleKey: 'navbar.navbar.syncFilesTitle',
  },
  {
    run: 'syncback',
    icon: FaRotateLeft,
    tone: 'text-info',
    labelKey: 'navbar.navbar.syncBack',
    titleKey: 'navbar.navbar.syncBackTitle',
  },
  {
    run: 'run-provisioners',
    icon: FaListCheck,
    tone: 'text-info',
    labelKey: 'navbar.navbar.runProvisioners',
    titleKey: 'navbar.navbar.runProvisionersTitle',
  },
];

/**
 * The provisioning commands of the machine's command list, Provision,
 * Sync files, Sync back and Run provisioners, while `provisioningGates`
 * offers them by the machine's detail, the detail the page holds or, when
 * it holds none, read once the Controls menu or the search box opens;
 * each opens the machine's Provisioning page with its action in `run`.
 *
 * @param {Object} options
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {string} options.name - The machine's name
 * @param {Object|null} options.server - The host's registry row
 * @param {Object|null} options.user - The signed-in person
 * @param {boolean} options.busy - Whether an action is in flight
 * @param {boolean} options.wanted - Whether the menu or the search box is open
 * @returns {Array<Object>} The commands
 */
export const useProvisioningCommands = ({ id, name, server, user, busy, wanted }) => {
  const navigate = useNavigate();
  const { detail } = useMachineDetail(id, name, { ask: wanted });
  const gates = provisioningGates({ server, detail, role: user?.role });
  if (!gates.rows) {
    return [];
  }
  return ROWS.map(row => ({
    key: row.run,
    group: 'provisioning',
    icon: row.icon,
    tone: row.tone,
    labelKey: row.labelKey,
    titleKey: row.titleKey,
    action: row.run,
    disabled: busy,
    run: () => navigate(provisioningRoute(id, name, row.run)),
  }));
};
