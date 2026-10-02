import PropTypes from 'prop-types';

import { useFolds } from '../../../hooks/useFolds';
import { pageContextShape } from '../../../utils/itemShape';
import { useMachineRow } from '../hooks/useHostMachines';
import { useHostRow } from '../hooks/useHostRow';
import { useHostStats } from '../hooks/useHostStats';
import { useMachineDetail } from '../hooks/useMachineDetail';
import { isRunning } from '../utils/hosts';
import { machineToolGates } from '../utils/machineTools';

import MachineSnapshots from './MachineSnapshots';
import SnapshotPolicyCard from './SnapshotPolicyCard';

/**
 * The snapshots of one machine as one unit, hyperweaver-ui's Snapshots
 * tab: the snapshots of `MachineSnapshots` with the retention policy of
 * `SnapshotPolicyCard` under their heading, and every dialog of theirs.
 * The unit is handed the host, the machine and the page's context and
 * nothing else: the host's own row, the machine's own row, its running
 * state and its detail are the copies the hosts feature's hooks hold, so
 * the machine page draws the unit as its Snapshots tab, at
 * `/hosts/{id}/machines/{name}/snapshots`, without the overview's cards
 * around it. It draws behind
 * `machine-snapshots` once the machine's row answered, the policy for a
 * person who may create machines on a host that lists `machine-modify`
 * and never of a machine on UTM, and the policy's fold is kept with the
 * table's preferences under `table_prefs_snapshots`.
 */
const MachineSnapshotsView = ({ id, name, context }) => {
  const server = useHostRow(id);
  const { stats } = useHostStats(id);
  const row = useMachineRow(id, name);
  const { detail } = useMachineDetail(id, name);
  const folds = useFolds(`${context.prefsPrefix}_snapshots`);
  const gates = machineToolGates({ server, machine: row.machine, role: context.user?.role });

  if (!gates.snapshots || !row.loaded) {
    return null;
  }

  const policy =
    gates.policy && detail ? (
      <div className="row g-3 mb-3">
        <SnapshotPolicyCard id={id} name={name} detail={detail} folds={folds} />
      </div>
    ) : null;

  return (
    <div data-view="machine-snapshots">
      <MachineSnapshots
        id={id}
        name={name}
        context={context}
        machine={row.machine}
        running={isRunning(stats, name)}
        policy={policy}
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
