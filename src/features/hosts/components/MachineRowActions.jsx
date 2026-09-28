import PropTypes from 'prop-types';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaCirclePlay,
  FaEye,
  FaGear,
  FaMoon,
  FaPause,
  FaPlay,
  FaRotate,
  FaStop,
} from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import RowMenu from '../../../components/common/RowMenu';
import { rowActionsOf } from '../utils/machines';
import { canStartStopMachines } from '../utils/permissions';

const BUTTONS = [
  { action: 'start', icon: FaPlay, tone: 'success', labelKey: 'hosts.controls.powerOn' },
  { action: 'pause', icon: FaPause, tone: 'warning', labelKey: 'hosts.controls.pause' },
  { action: 'suspend', icon: FaMoon, tone: 'warning', labelKey: 'hosts.controls.suspend' },
  { action: 'shutdown', icon: FaStop, tone: 'danger', labelKey: 'hosts.controls.shutdown' },
  { action: 'resume', icon: FaCirclePlay, tone: 'success', labelKey: 'hosts.controls.resume' },
];

const machinePath = (id, name) => `/hosts/${id}/machines/${encodeURIComponent(name)}`;

/**
 * The actions of one row of the machines list, hyperweaver-ui's row
 * buttons: View, the link to the machine's page; Power on, Pause,
 * Suspend, Shutdown and Resume, each drawn only while `rowActionsOf`
 * offers it, by the person's role, the machine's own status and the
 * gates the Controls menu shares; and the More menu with Restart while
 * the machine runs and Open. A button hands `onAction` the machine and
 * the action, the page sending the one request through the Controls
 * menu's runner, and every button is held while a request is in flight.
 */
const MachineRowActions = ({ machine, id, server = null, role = '', busy, onAction }) => {
  const { t } = useTranslation();
  const offered = rowActionsOf({ server, machine, role });
  const to = machinePath(id, machine.name);
  const view = t('hosts.machines.view');
  const more = t('hosts.machines.moreActions');
  const gear = (
    <>
      <FaGear aria-hidden="true" />
      <span className="visually-hidden">{more}</span>
    </>
  );

  return (
    <span className="d-inline-flex align-items-center gap-1" data-row-actions={machine.name}>
      <Link to={to} className="btn btn-sm btn-outline-info" title={view} aria-label={view}>
        <FaEye aria-hidden="true" />
      </Link>
      {BUTTONS.filter(button => offered[button.action]).map(
        ({ action, icon: Icon, tone, labelKey }) => (
          <button
            key={action}
            type="button"
            className={`btn btn-sm btn-outline-${tone}`}
            title={t(labelKey)}
            aria-label={t(labelKey)}
            data-action={action}
            disabled={busy}
            onClick={() => onAction(machine, action)}
          >
            <Icon aria-hidden="true" />
          </button>
        )
      )}
      {canStartStopMachines(role) ? (
        <RowMenu label={gear}>
          {offered.restart ? (
            <Dropdown.Item
              as="button"
              type="button"
              data-action="restart"
              disabled={busy}
              onClick={() => onAction(machine, 'restart')}
            >
              <FaRotate className="text-warning me-2" aria-hidden="true" />
              {t('hosts.controls.restart')}
            </Dropdown.Item>
          ) : null}
          <Dropdown.Item as={Link} to={to}>
            <FaEye className="text-info me-2" aria-hidden="true" />
            {t('hosts.sidebar.open')}
          </Dropdown.Item>
        </RowMenu>
      ) : null}
    </span>
  );
};

MachineRowActions.propTypes = {
  machine: PropTypes.shape({
    name: PropTypes.string.isRequired,
    status: PropTypes.string,
    hypervisor: PropTypes.string,
  }).isRequired,
  id: PropTypes.string.isRequired,
  server: PropTypes.object,
  role: PropTypes.string,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};

export default MachineRowActions;
