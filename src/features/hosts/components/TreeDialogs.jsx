import PropTypes from 'prop-types';

import { useStatus } from '../../../contexts/StatusContext';
import { useHostRow } from '../hooks/useHostRow';
import { hostHasFeature } from '../utils/capabilities';

import HostPowerDialogs from './HostPowerDialogs';
import MachineDangerDialogs from './MachineDangerDialogs';
import MachineToolDialogs, { MACHINE_TOOLS } from './MachineToolDialogs';

const MACHINE_ACTIONS = ['kill', 'destroy'];

const HOST_ACTIONS = ['host-restart', 'host-shutdown'];

const among = (actions, action) => (actions.includes(action) ? action : '');

/**
 * The dialogs of the sidebar tree's menu, the node the hosts feature
 * hands the sidebar as its tree's `dialogs`: the machine dialogs for a
 * Force kill or a Destroy asked of a machine's node and the host dialogs
 * for a Restart host or a Power off host asked of a host's node, the
 * same dialogs the Controls menu opens, each handing `onRun` the target
 * the row was asked of, the restart offering the fast reboot while the
 * target host's own row lists `host-fast-reboot`; and the dialogs of a
 * machine's tools for a Snapshot or a Clone asked of a machine's node,
 * which send their own one request.
 */
const TreeDialogs = ({ target, onClose, onRun }) => {
  const status = useStatus();
  const server = useHostRow(target.id);
  const run = (action, options) => onRun({ id: target.id, name: target.name, action, options });
  return (
    <>
      <MachineDangerDialogs
        action={among(MACHINE_ACTIONS, target.action)}
        name={target.name}
        onClose={onClose}
        onRun={run}
      />
      <HostPowerDialogs
        action={among(HOST_ACTIONS, target.action)}
        fast={hostHasFeature(server, 'host-fast-reboot')}
        onClose={onClose}
        onRun={run}
      />
      <MachineToolDialogs
        status={status}
        tool={among(MACHINE_TOOLS, target.action)}
        id={target.id}
        name={target.name}
        onClose={onClose}
      />
    </>
  );
};

TreeDialogs.propTypes = {
  target: PropTypes.shape({
    action: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onRun: PropTypes.func.isRequired,
};

export default TreeDialogs;
