import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  FaBoxArchive,
  FaClockRotateLeft,
  FaCloudArrowUp,
  FaPen,
  FaPlay,
  FaTrash,
} from 'react-icons/fa6';

const BUTTONS = [
  {
    action: 'edit',
    offer: 'rename',
    icon: FaPen,
    tone: 'secondary',
    labelKey: 'machine.machineSnapshots.renameTooltip',
    stopped: false,
  },
  {
    action: 'restore',
    offer: 'snapshot',
    icon: FaClockRotateLeft,
    tone: 'warning',
    labelKey: 'machine.machineSnapshots.restoreTooltip',
    stopped: true,
  },
  {
    action: 'restore-start',
    offer: 'snapshot',
    icon: FaPlay,
    tone: 'warning',
    labelKey: 'machine.machineSnapshots.restoreStartTooltip',
    stopped: true,
  },
  {
    action: 'export',
    offer: 'snapshotTemplates',
    icon: FaBoxArchive,
    tone: 'secondary',
    labelKey: 'machine.machineSnapshots.buildTemplateTooltip',
    stopped: false,
  },
  {
    action: 'publish',
    offer: 'snapshotTemplates',
    icon: FaCloudArrowUp,
    tone: 'info',
    labelKey: 'machine.machineSnapshots.publishTooltip',
    stopped: false,
  },
  {
    action: 'delete',
    offer: 'snapshot',
    icon: FaTrash,
    tone: 'danger',
    labelKey: 'machine.machineSnapshots.deleteTooltip',
    stopped: false,
  },
];

/**
 * The actions of one row of a machine's snapshots, hyperweaver-ui's row
 * buttons, each drawn only while `offers` names it: Edit, the rename and
 * the description, never of a machine on UTM; Restore and Restore and
 * start, both held while the machine runs, the agent restoring a machine
 * that is off, their tooltip saying so; Make template and Publish on a
 * host that lists `templates` and whose agent makes a template of a
 * snapshot; and Delete. A button hands `onAction` its
 * action and the snapshot, the section opening the dialog or the
 * confirmation, and every button is held while a request is in flight.
 */
const SnapshotRowActions = ({ snapshot, offers, running, busy, onAction }) => {
  const { t } = useTranslation();
  return (
    <span className="d-inline-flex align-items-center gap-1" data-snapshot={snapshot.name}>
      {BUTTONS.filter(button => offers[button.offer]).map(
        ({ action, icon: Icon, tone, labelKey, stopped }) => {
          const held = stopped && running;
          const label = t(held ? 'machine.machineSnapshots.restoreStoppedTooltip' : labelKey);
          return (
            <button
              key={action}
              type="button"
              className={`btn btn-sm btn-outline-${tone}`}
              title={label}
              aria-label={label}
              data-action={action}
              disabled={busy || held}
              onClick={() => onAction(action, snapshot)}
            >
              <Icon aria-hidden="true" />
            </button>
          );
        }
      )}
    </span>
  );
};

SnapshotRowActions.propTypes = {
  snapshot: PropTypes.shape({ name: PropTypes.string.isRequired }).isRequired,
  offers: PropTypes.objectOf(PropTypes.bool).isRequired,
  running: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};

export default SnapshotRowActions;
