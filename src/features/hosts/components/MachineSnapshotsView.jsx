import PropTypes from 'prop-types';

import { pageContextShape } from '../../../utils/itemShape';
import { useMachineRow } from '../hooks/useHostMachines';
import { useHostRow } from '../hooks/useHostRow';
import { useHostStats } from '../hooks/useHostStats';
import { isRunning } from '../utils/hosts';
import { machineToolGates } from '../utils/machineTools';

import MachineSnapshots from './MachineSnapshots';

/**
 * The snapshots of one machine as one unit, the machine's Snapshots page
 * at `/hosts/{id}/machines/{name}/snapshots`: the snapshots of
 * `MachineSnapshots` and every dialog of theirs. The unit is handed the
 * host, the machine and the page's context and nothing else: the host's
 * own row, the machine's own row and its running state are the copies
 * the hosts feature's hooks hold, so the machine page draws it without
 * the overview's cards around it. It draws behind `machine-snapshots`
 * once the machine's row answered; the retention policy is a tab of the
 * machine's Settings page.
 */
const MachineSnapshotsView = ({ id, name, context }) => {
  const server = useHostRow(id);
  const { stats } = useHostStats(id);
  const row = useMachineRow(id, name);
  const gates = machineToolGates({ server, machine: row.machine, role: context.user?.role });

  if (!gates.snapshots || !row.loaded) {
    return null;
  }

  return (
    <div data-view="machine-snapshots">
      <MachineSnapshots
        id={id}
        name={name}
        context={context}
        machine={row.machine}
        running={isRunning(stats, name)}
      />
    </div>
  );
};

MachineSnapshotsView.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
};

export default MachineSnapshotsView;
