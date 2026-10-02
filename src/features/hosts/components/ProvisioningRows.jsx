import PropTypes from 'prop-types';
import { Dropdown } from 'react-bootstrap';
import { FaGears, FaListCheck, FaRotate, FaRotateLeft } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import { useMachineDetail } from '../hooks/useMachineDetail';
import { provisioningGates, provisioningRoute } from '../utils/provisioning';

import { ActionRow } from './HostActionOptions';

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
 * The provisioning rows of the machine Controls menu, hyperweaver-ui's:
 * Provision, Sync files, Sync back and Run provisioners, drawn for a
 * person who may start and stop machines on a host that lists
 * `provisioning` while the machine's detail carries a provisioner
 * document, the truth `provisioning_configured` reads; each opens the
 * machine's Provisioning page with its action in `run`, which the page
 * sends and reports.
 */
const ProvisioningRows = ({ id, name, server = null, user = null, busy }) => {
  const navigate = useNavigate();
  const { detail } = useMachineDetail(id, name);
  const gates = provisioningGates({ server, detail, role: user?.role });

  if (!gates.rows) {
    return null;
  }

  return (
    <>
      <Dropdown.Divider />
      {ROWS.map(row => (
        <ActionRow
          key={row.run}
          icon={row.icon}
          tone={row.tone}
          labelKey={row.labelKey}
          titleKey={row.titleKey}
          action={row.run}
          disabled={busy}
          onClick={() => navigate(provisioningRoute(id, name, row.run))}
        />
      ))}
    </>
  );
};

ProvisioningRows.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  server: PropTypes.object,
  user: PropTypes.object,
  busy: PropTypes.bool.isRequired,
};

export default ProvisioningRows;
