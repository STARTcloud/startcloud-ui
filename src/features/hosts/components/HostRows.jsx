import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { FaPowerOff, FaRotate } from 'react-icons/fa6';

import { useHostActions } from '../hooks/useHostActions';
import { useHostStats } from '../hooks/useHostStats';
import { hostHasFeature } from '../utils/capabilities';
import { canControlHosts } from '../utils/permissions';

import BulkRows from './BulkRows';
import { ActionRow, PrivilegeLine } from './HostActionOptions';
import HostPowerDialogs from './HostPowerDialogs';

/**
 * The host rows of the Controls menu on `/hosts/{id}`: Restart host and
 * Power off host while `powered`, the role and the agent's `host-power`
 * token both allowing, each behind the dialogs of `HostPowerDialogs`,
 * its options, the fast reboot among them while the host lists
 * `host-fast-reboot`, and then the typed confirmation, then one request through
 * `useHostActions`, the host's stats read again once after a success;
 * then, while `bulk`, the role and the agent's `machines` token both
 * allowing, the bulk rows over this host's machines; a role short of
 * controlling the host reads the privilege line last.
 */
const HostRows = ({ status, id, powered, bulk, server = null, user = null }) => {
  const role = user?.role;
  const { refresh } = useHostStats(id);
  const { run, busy } = useHostActions({ status, id, name: '', onDone: refresh });
  const [action, setAction] = useState('');
  const servers = useMemo(() => (server ? [server] : []), [server]);

  return (
    <>
      {powered ? (
        <>
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
          {powered ? <Dropdown.Divider /> : null}
          <BulkRows status={status} servers={servers} scope="host" user={user} />
        </>
      ) : null}
      {canControlHosts(role) ? null : (
        <>
          {powered || bulk ? <Dropdown.Divider /> : null}
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
