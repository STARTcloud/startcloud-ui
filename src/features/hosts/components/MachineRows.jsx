import PropTypes from 'prop-types';
import { useState } from 'react';
import { Dropdown, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBolt, FaPlay, FaRotate, FaSkull, FaStop, FaTrash } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useHostActions } from '../hooks/useHostActions';
import { useHostStats } from '../hooks/useHostStats';
import { isRunning } from '../utils/hosts';
import { canDestroyMachines, canRestartMachines, canStartStopMachines } from '../utils/permissions';

import { ActionOptionsModal, ActionRow, PrivilegeLine } from './HostActionOptions';

const PowerRows = ({ role, running, busy, onAction }) => {
  if (!canStartStopMachines(role)) {
    return null;
  }
  return (
    <>
      {running ? (
        <ActionRow
          icon={FaStop}
          tone="text-danger"
          labelKey="hosts.controls.shutdown"
          disabled={busy}
          onClick={() => onAction('shutdown')}
        />
      ) : (
        <ActionRow
          icon={FaPlay}
          tone="text-success"
          labelKey="hosts.controls.powerOn"
          disabled={busy}
          onClick={() => onAction('start')}
        />
      )}
      {running && canRestartMachines(role) ? (
        <>
          <ActionRow
            icon={FaRotate}
            tone="text-warning"
            labelKey="hosts.controls.restart"
            disabled={busy}
            onClick={() => onAction('restart')}
          />
          <ActionRow
            icon={FaBolt}
            tone="text-danger"
            labelKey="hosts.controls.reset"
            disabled={busy}
            onClick={() => onAction('reset')}
          />
        </>
      ) : null}
    </>
  );
};

PowerRows.propTypes = {
  role: PropTypes.string,
  running: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
};

/**
 * The machine rows of the Controls menu on `/hosts/{id}/machines/{name}`:
 * Power on while the machine is stopped, Shutdown, Restart and Reset
 * while it runs, each one request through `useHostActions`; then, for a
 * role that may destroy, Force kill while it runs and Destroy, both
 * behind the typed confirmation, Destroy first collecting whether the
 * agent's disks go with it; the running state from the host's stats, read
 * again once after every success. A role short of destroying reads the
 * privilege line instead.
 */
const MachineRows = ({ status, id, name, user = null }) => {
  const { t } = useTranslation();
  const role = user?.role;
  const { stats, refresh } = useHostStats(id);
  const { run, busy } = useHostActions({ status, id, name, onDone: refresh });
  const [pending, setPending] = useState('');
  const [cleanupDisks, setCleanupDisks] = useState(true);
  const running = isRunning(stats, name);
  const destroyTitle = t('hosts.controls.destroyOptions.title', { name });

  const close = () => setPending('');

  const confirmPending = () => {
    if (pending === 'destroy') {
      run('destroy', { cleanupDisks });
    } else {
      run('kill');
    }
  };

  return (
    <>
      <PowerRows role={role} running={running} busy={busy} onAction={run} />
      <Dropdown.Divider />
      {canDestroyMachines(role) ? (
        <>
          {running ? (
            <ActionRow
              icon={FaSkull}
              tone="text-danger"
              labelKey="hosts.controls.forceKill"
              disabled={busy}
              onClick={() => setPending('kill')}
            />
          ) : null}
          <ActionRow
            icon={FaTrash}
            tone="text-danger"
            labelKey="hosts.controls.destroy"
            disabled={busy}
            onClick={() => {
              setCleanupDisks(true);
              setPending('destroy-options');
            }}
          />
        </>
      ) : (
        <PrivilegeLine />
      )}
      <ActionOptionsModal
        show={pending === 'destroy-options'}
        title={destroyTitle}
        onHide={close}
        onContinue={() => setPending('destroy')}
      >
        <p>{t('hosts.controls.destroyOptions.message')}</p>
        <Form.Check
          type="checkbox"
          id="destroy-cleanup-disks"
          label={t('hosts.controls.destroyOptions.cleanupDisks')}
          checked={cleanupDisks}
          onChange={event => setCleanupDisks(event.target.checked)}
        />
      </ActionOptionsModal>
      <ConfirmModal
        show={pending === 'kill' || pending === 'destroy'}
        handleClose={close}
        handleConfirm={confirmPending}
        title={pending === 'destroy' ? destroyTitle : t('hosts.controls.forceKill')}
        variant="delete"
      />
    </>
  );
};

MachineRows.propTypes = {
  status: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  user: PropTypes.object,
};

export default MachineRows;
