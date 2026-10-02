import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { FaEye, FaGears, FaPlus, FaPowerOff, FaRotate } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import { useHostActions } from '../hooks/useHostActions';
import { useHostStats } from '../hooks/useHostStats';
import { HOST_PAGES, hostPagePath } from '../pages';
import { hostHasFeature } from '../utils/capabilities';
import { createRouteOf, hostCreates } from '../utils/machineCreate';
import { canControlHosts } from '../utils/permissions';

import BulkRows from './BulkRows';
import { ActionRow, PrivilegeLine, ShareLinkRow } from './HostActionOptions';
import HostPowerDialogs from './HostPowerDialogs';

const OVERVIEW = HOST_PAGES.find(page => page.key === 'overview');

const MANAGE = HOST_PAGES.find(page => page.key === 'manage');

/**
 * The host rows of the Controls menu on a host's routes: first Share
 * link, hyperweaver-ui's row, then View host
 * details, hyperweaver-ui's row, which opens the host's Overview, Manage
 * host, hyperweaver-ui's row, which opens the host's Manage page while
 * the host's own row offers it, and
 * New machine while `hostCreates` offers it, the role and the agent's
 * `machine-create` token both allowing, which opens the create wizard on
 * the host's page; then
 * Restart host and Power off host while `powered`, the role and the
 * agent's `host-power` token both allowing, each behind the dialogs of
 * `HostPowerDialogs`, its options, the fast reboot among them while the
 * host lists `host-fast-reboot`, and then the typed confirmation, then
 * one request through `useHostActions`, the host's stats read again once
 * after a success; then, while `bulk`, the role and the agent's
 * `machines` token both allowing, the bulk rows over this host's
 * machines; a role short of controlling the host reads the privilege
 * line last.
 */
const HostRows = ({ status, id, powered, bulk, server = null, user = null }) => {
  const role = user?.role;
  const navigate = useNavigate();
  const { refresh } = useHostStats(id);
  const { run, busy } = useHostActions({ status, id, name: '', onDone: refresh });
  const [action, setAction] = useState('');
  const servers = useMemo(() => (server ? [server] : []), [server]);

  return (
    <>
      <ShareLinkRow />
      <Dropdown.Divider />
      <ActionRow
        icon={FaEye}
        tone="text-info"
        labelKey="navbar.navbar.viewHostDetails"
        action="view-host"
        onClick={() => navigate(hostPagePath(id, OVERVIEW))}
      />
      {MANAGE.offered(server) ? (
        <ActionRow
          icon={FaGears}
          tone="text-info"
          labelKey="navbar.navbar.manageHost"
          action="manage-host"
          onClick={() => navigate(hostPagePath(id, MANAGE))}
        />
      ) : null}
      {hostCreates(server, role) ? (
        <ActionRow
          icon={FaPlus}
          tone="text-success"
          labelKey="navbar.navbar.newMachine"
          action="new-machine"
          onClick={() => navigate(createRouteOf(id))}
        />
      ) : null}
      {powered ? (
        <>
          <Dropdown.Divider />
          <ActionRow
            icon={FaRotate}
            tone="text-warning"
            labelKey="hosts.controls.restartHost"
            disabled={busy}
            onClick={() => setAction('host-restart')}
          />
          <ActionRow
            icon={FaPowerOff}
            tone="text-danger"
            labelKey="hosts.controls.powerOffHost"
            disabled={busy}
            onClick={() => setAction('host-shutdown')}
          />
        </>
      ) : null}
      {bulk ? (
        <>
          <Dropdown.Divider />
          <BulkRows status={status} servers={servers} scope="host" user={user} />
        </>
      ) : null}
      {canControlHosts(role) ? null : (
        <>
          <Dropdown.Divider />
          <PrivilegeLine />
        </>
      )}
      <HostPowerDialogs
        action={action}
        fast={hostHasFeature(server, 'host-fast-reboot')}
        onClose={() => setAction('')}
        onRun={run}
      />
    </>
  );
};

HostRows.propTypes = {
  status: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
  powered: PropTypes.bool.isRequired,
  bulk: PropTypes.bool.isRequired,
  server: PropTypes.object,
  user: PropTypes.object,
};

export default HostRows;
