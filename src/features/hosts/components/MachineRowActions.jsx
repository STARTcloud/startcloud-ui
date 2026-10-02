import PropTypes from 'prop-types';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaCirclePlay,
  FaClone,
  FaDisplay,
  FaEye,
  FaGear,
  FaGears,
  FaMoon,
  FaPause,
  FaPlay,
  FaRotate,
  FaStop,
  FaTerminal,
} from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import RowMenu from '../../../components/common/RowMenu';
import { consoleDoorsOf, consoleRoute } from '../utils/consoles';
import { guestToolsOf } from '../utils/guestTools';
import { machineRoute, rowActionsOf, statusOf } from '../utils/machines';
import { machineToolGates } from '../utils/machineTools';
import { canStartStopMachines } from '../utils/permissions';
import { provisioningRoute, rowProvisions } from '../utils/provisioning';

const BUTTONS = [
  { action: 'start', icon: FaPlay, tone: 'success', labelKey: 'hosts.controls.powerOn' },
  { action: 'pause', icon: FaPause, tone: 'warning', labelKey: 'hosts.controls.pause' },
  { action: 'suspend', icon: FaMoon, tone: 'warning', labelKey: 'hosts.controls.suspend' },
  { action: 'shutdown', icon: FaStop, tone: 'danger', labelKey: 'hosts.controls.shutdown' },
  { action: 'resume', icon: FaCirclePlay, tone: 'success', labelKey: 'hosts.controls.resume' },
];

/**
 * The actions of one row of the machines list, hyperweaver-ui's row
 * buttons: View, the link to the machine's page; Power on, Pause,
 * Suspend, Shutdown and Resume, each drawn only while `rowActionsOf`
 * offers it, by the person's role, the machine's own status and the
 * gates the Controls menu shares; Provision, the link to the machine's
 * Provisioning page with the provision in `run`, while `rowProvisions`
 * offers it, the row naming its provisioner on a host that lists
 * `provisioning`; and the More menu with Restart while
 * the machine runs, Clone while `machineToolGates` offers it, the host
 * listing `machine-create`, Run in guest and Set display size while
 * `guestToolsOf` offers them, one row a console the host's row lists,
 * each a link opening it on the machine's page, and Open. A button hands `onAction` the
 * machine and the action, `noun` the word the View tooltip names the
 * machine by, the page sending the one request through the
 * Controls menu's runner, Clone, Run in guest and Set display size hand
 * `onTool` the machine and `clone`, `exec` or `display`, the page
 * opening that dialog, and every button is held while a request is in
 * flight.
 */
const MachineRowActions = ({
  machine,
  id,
  server = null,
  role = '',
  noun = '',
  busy,
  onAction,
  onTool,
}) => {
  const { t } = useTranslation();
  const offered = rowActionsOf({ server, machine, role });
  const tools = machineToolGates({ server, machine, role });
  const provisions = rowProvisions({ server, machine, role });
  const guestTools = guestToolsOf({
    server,
    machine,
    role,
    running: statusOf(machine) === 'running',
  });
  const to = machineRoute(id, machine.name);
  const view = t('machine.machineListPanel.viewTooltip', { noun });
  const provision = t('machine.machineListPanel.provisionTooltip');
  const more = t('machine.machineListPanel.moreActionsTooltip');
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
      {provisions ? (
        <Link
          to={provisioningRoute(id, machine.name, 'provision')}
          className="btn btn-sm btn-outline-warning"
          title={provision}
          aria-label={provision}
          data-action="provision"
        >
          <FaGears aria-hidden="true" />
        </Link>
      ) : null}
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
          {tools.clone ? (
            <Dropdown.Item
              as="button"
              type="button"
              data-action="clone"
              disabled={busy}
              onClick={() => onTool(machine, 'clone')}
            >
              <FaClone className="text-info me-2" aria-hidden="true" />
              {t('machine.machineListPanel.cloneItem')}
            </Dropdown.Item>
          ) : null}
          {guestTools.exec ? (
            <Dropdown.Item
              as="button"
              type="button"
              data-action="exec"
              disabled={busy}
              onClick={() => onTool(machine, 'exec')}
            >
              <FaTerminal className="text-info me-2" aria-hidden="true" />
              {t('hosts.controls.guestExec')}
            </Dropdown.Item>
          ) : null}
          {guestTools.display ? (
            <Dropdown.Item
              as="button"
              type="button"
              data-action="display"
              disabled={busy}
              onClick={() => onTool(machine, 'display')}
            >
              <FaDisplay className="text-info me-2" aria-hidden="true" />
              {t('hosts.controls.displayResize')}
            </Dropdown.Item>
          ) : null}
          {consoleDoorsOf(server).map(door => (
            <Dropdown.Item
              key={door.key}
              as={Link}
              to={consoleRoute(id, machine.name, door.key)}
              data-action={`console-${door.key}`}
            >
              <door.icon className="text-info me-2" aria-hidden="true" />
              {t(door.labelKey)}
            </Dropdown.Item>
          ))}
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
  noun: PropTypes.string,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
  onTool: PropTypes.func.isRequired,
};

export default MachineRowActions;
