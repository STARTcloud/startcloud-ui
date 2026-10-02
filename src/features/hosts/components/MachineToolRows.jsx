import PropTypes from 'prop-types';
import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { FaBoxArchive, FaCamera, FaClone, FaCompactDisc, FaTruckArrowRight } from 'react-icons/fa6';

import { machineToolGates } from '../utils/machineTools';

import { ActionRow } from './HostActionOptions';
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
 * The tool rows of the machine Controls menu, hyperweaver-ui's Snapshot,
 * Clone, Convert to template, Install OS and Move, each drawn only while
 * `machineToolGates` offers it for the host's own row, the machine's own
 * row and the person's role: Snapshot while the host lists
 * `machine-snapshots`, Clone while it lists `machine-create`, Convert to
 * template while it lists `templates`, and Install OS, the unattended
 * install from an ISO, and Move, the move of a VirtualBox machine's
 * files, on a host that names `virtualbox` and never for a machine on
 * UTM, so a bhyve host, whose Move is the zone lifecycle's, draws
 * neither here. A row opens its dialog of
 * `MachineToolDialogs`, and the dialog's one request is sent from there.
 */
const MachineToolRows = ({
  status,
  id,
  name,
  server = null,
  machine = null,
  user = null,
  busy,
}) => {
  const [tool, setTool] = useState('');
  const gates = machineToolGates({ server, machine, role: user?.role });
  const rows = ROWS.filter(row => gates[row.gate]);

  return (
    <>
      {rows.length > 0 ? <Dropdown.Divider /> : null}
      {rows.map(row => (
        <ActionRow
          key={row.tool}
          icon={row.icon}
          tone={row.tone}
          labelKey={row.labelKey}
          titleKey={row.titleKey}
          action={`tool-${row.tool}`}
          disabled={busy}
          onClick={() => setTool(row.tool)}
        />
      ))}
      <MachineToolDialogs
        status={status}
        tool={tool}
        id={id}
        name={name}
        onClose={() => setTool('')}
      />
    </>
  );
};

MachineToolRows.propTypes = {
  status: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  server: PropTypes.object,
  machine: PropTypes.object,
  user: PropTypes.object,
  busy: PropTypes.bool.isRequired,
};

export default MachineToolRows;
