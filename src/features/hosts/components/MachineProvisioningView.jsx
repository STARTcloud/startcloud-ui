import PropTypes from 'prop-types';

import SectionHeading from '../../../components/common/SectionHeading';
import { pageContextShape } from '../../../utils/itemShape';
import { useMachineRow } from '../hooks/useHostMachines';

import MachineProvisioning from './MachineProvisioning';

/**
 * The provisioning of one machine as one unit, hyperweaver-ui's
 * Provisioning tab, drawn by the machine page at
 * `/hosts/{id}/machines/{name}/provisioning` without the overview's
 * cards around it: the heading, `title` with `actions` last in its pane,
 * the status rows, the editor and every dialog of `MachineProvisioning`,
 * handed the host, the machine and the page's context alone, the host's
 * own row and the machine's detail the copies the hosts feature's hooks
 * hold. It draws the heading alone while the host offers the machine's
 * row and the row has not answered.
 */
const MachineProvisioningView = ({ id, name, context, title, actions = null }) => {
  const row = useMachineRow(id, name);

  if (row.offered && !row.loaded) {
    return <SectionHeading title={title} actions={actions} />;
  }

  return (
    <div data-view="machine-provisioning">
      <MachineProvisioning id={id} name={name} context={context} title={title} actions={actions} />
    </div>
  );
};

MachineProvisioningView.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
  title: PropTypes.string.isRequired,
  actions: PropTypes.node,
};

export default MachineProvisioningView;
