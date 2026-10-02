import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import ToolFormDialog from './ToolFormDialog';

/**
 * The dialog that moves the files of one VirtualBox machine,
 * hyperweaver-ui's move form, a form dialog: the folder on the host the
 * machine's files go to, which is required, the note that says what
 * moves, and, while the machine runs, the warning that the agent moves a
 * machine that is off. Move hands `onMove` the path, trimmed; a form
 * without a path says so and sends nothing. The path of a host on
 * Windows begins with no slash, so none is asked for. The move of a
 * zone, its zonepath, is the zone's own row and its own dialog.
 */
const MachineMoveDialog = ({ name, running, busy, onClose, onMove }) => {
  const { t } = useTranslation();
  const [path, setPath] = useState('');
  const [problem, setProblem] = useState('');

  const submit = () => {
    const given = Boolean(path.trim());
    setProblem(given ? '' : 'machine.moveMachineModal.pathRequired');
    if (given) {
      onMove(path.trim());
    }
  };

  return (
    <ToolFormDialog
      dialog="machine-move"
      title={t('machine.moveMachineModal.title', { machineName: name })}
      submitKey="machine.moveMachineModal.submit"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      {running ? (
        <div className="alert alert-warning" role="status" data-note="running">
          {t('machine.moveMachineModal.runningWarning', { machineName: name })}
        </div>
      ) : null}
      <div className="mb-3">
        <label className="form-label" htmlFor="machine-move-path">
          {t('machine.moveMachineModal.destinationLabel')}{' '}
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        </label>
        <input
          id="machine-move-path"
          className="form-control font-monospace"
          type="text"
          required
          value={path}
          disabled={busy}
          onChange={event => {
            setPath(event.target.value);
            setProblem('');
          }}
        />
        <p className="form-text text-muted mb-0">{t('machine.moveMachineModal.relocateNote')}</p>
      </div>
    </ToolFormDialog>
  );
};

MachineMoveDialog.propTypes = {
  name: PropTypes.string.isRequired,
  running: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
};

export default MachineMoveDialog;
