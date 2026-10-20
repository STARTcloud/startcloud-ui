import PropTypes from 'prop-types';

import SectionHeading from '../../../components/common/SectionHeading';
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
 * `MachineSnapshots` under the page's one heading, `title` with
 * `actions` last in its pane, and every dialog of theirs. The unit is
 * handed the host, the machine and the page's context and nothing else:
 * the host's own row, the machine's own row and its running state are the
 * copies the hosts feature's hooks hold, so the machine page draws it
 * without the overview's cards around it. It draws behind
 * `machine-snapshots` once the machine's row answered, the heading alone
 * before; the retention policy is a tab of the machine's Settings page.
 */
const MachineSnapshotsView = ({ id, name, context, title, actions = null }) => {
  const server = useHostRow(id);
  const { stats } = useHostStats(id);
  const row = useMachineRow(id, name);
  const gates = machineToolGates({ server, machine: row.machine, role: context.user?.role });

  if (!gates.snapshots || !row.loaded) {
    return <SectionHeading title={title} actions={actions} />;
  }

  return (
    <div data-view="machine-snapshots">
      <MachineSnapshots
        id={id}
        name={name}
        context={context}
        machine={row.machine}
        running={isRunning(stats, name)}
        title={title}
        actions={actions}
      />
    </div>
  );
};

MachineSnapshotsView.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
  title: PropTypes.string.isRequired,
  actions: PropTypes.node,
};

export default MachineSnapshotsView;
