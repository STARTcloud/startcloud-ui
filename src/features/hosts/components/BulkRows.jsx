import PropTypes from 'prop-types';
import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaPlay, FaRotate, FaStop } from 'react-icons/fa6';

import { machineNoun } from '../utils/hosts';
import { canRestartMachines, canStartStopMachines } from '../utils/permissions';

import BulkActionsDialog from './BulkActionsDialog';
import { ActionRow } from './HostActionOptions';

const ROWS = [
  { action: 'start', icon: FaPlay, tone: 'text-success', allowed: canStartStopMachines },
  { action: 'stop', icon: FaStop, tone: 'text-danger', allowed: canStartStopMachines },
  { action: 'restart', icon: FaRotate, tone: 'text-warning', allowed: canRestartMachines },
];

/**
 * The bulk rows of the Controls menu: Start, Shut down and Restart over
 * the machines of the `servers` in scope, named by the noun their
 * hypervisors fix, under the heading of the scope, one host's machines
 * on a host's route and every host's on the home route; a row opens the
 * bulk actions dialog for its action. Nothing draws for a role that may
 * not start or stop a machine.
 */
const BulkRows = ({ status, servers, scope, user = null }) => {
  const { t } = useTranslation();
  const role = user?.role;
  const [action, setAction] = useState('');
  const noun = machineNoun(servers);

  if (!canStartStopMachines(role)) {
    return null;
  }

  return (
    <>
      <Dropdown.Header>
        {t(scope === 'all' ? 'hosts.bulk.acrossAllHosts' : `hosts.bulk.header.${noun}`)}
      </Dropdown.Header>
      {ROWS.filter(row => row.allowed(role)).map(row => (
        <ActionRow
          key={row.action}
          icon={row.icon}
          tone={row.tone}
          labelKey={`hosts.bulk.${row.action}.${noun}`}
          onClick={() => setAction(row.action)}
        />
      ))}
      {action ? (
        <BulkActionsDialog
          status={status}
          action={action}
          servers={servers}
          title={t(`hosts.bulk.title.${action}.${noun}`)}
          onHide={() => setAction('')}
        />
      ) : null}
    </>
  );
};

BulkRows.propTypes = {
  status: PropTypes.object.isRequired,
  servers: PropTypes.arrayOf(PropTypes.object).isRequired,
  scope: PropTypes.oneOf(['host', 'all']).isRequired,
  user: PropTypes.object,
};

export default BulkRows;
