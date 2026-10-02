import PropTypes from 'prop-types';

import { useFolds } from '../../../hooks/useFolds';
import { pageContextShape } from '../../../utils/itemShape';
import { useMachineRow } from '../hooks/useHostMachines';

import MachineProvisioning from './MachineProvisioning';

/**
 * The provisioning of one machine as one unit, hyperweaver-ui's
 * Provisioning tab, drawn by the machine page at
 * `/hosts/{id}/machines/{name}/provisioning` without the overview's
 * cards around it: the status card, the editor and every dialog of
 * `MachineProvisioning`, handed the host, the machine and the page's
 * context alone, the host's own row and the machine's detail the copies
 * the hosts feature's hooks hold, its folds kept under
 * `table_prefs_provisioning`. It draws once the machine's row answered
 * or the host offers no rows.
 */
const MachineProvisioningView = ({ id, name, context }) => {
  const row = useMachineRow(id, name);
  const folds = useFolds(`${context.prefsPrefix}_provisioning`);

  if (row.offered && !row.loaded) {
    return null;
  }

  return (
    <div data-view="machine-provisioning">
      <MachineProvisioning id={id} name={name} context={context} folds={folds} />
    </div>
  );
};

MachineProvisioningView.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
};

export default MachineProvisioningView;
