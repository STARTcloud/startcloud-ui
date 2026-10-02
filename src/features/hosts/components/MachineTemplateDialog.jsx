import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMachineSnapshots } from '../hooks/useMachineSnapshots';
import { exportBody } from '../utils/machineTools';
import { snapshotKey } from '../utils/snapshots';

import ToolFormDialog from './ToolFormDialog';

/**
 * The dialog that makes a template of one machine, hyperweaver-ui's
 * Convert to template, a form dialog: the file's name and, where the
 * host's agent makes a template of a snapshot, `picks`, and the machine
 * carries snapshots, the one the template is made from, the machine's
 * current state otherwise; while the machine runs and no snapshot is
 * chosen the dialog warns that the agent makes a template of a machine
 * that is off. The snapshots are the copy `useMachineSnapshots` holds,
 * asked for only where they are offered. On a host whose agent reads no
 * snapshot in its export the dialog offers none and the body names
 * none, the template being made of the machine's current state. Convert
 * hands `onSubmit` the body of the one request, `POST templates/export`.
 */
const MachineTemplateDialog = ({ id, name, picks, running, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const { snapshots } = useMachineSnapshots(id, name, picks);
  const [filename, setFilename] = useState('');
  const [snapshot, setSnapshot] = useState('');

  return (
    <ToolFormDialog
      dialog="machine-template"
      title={t('machine.convertToTemplateModal.title', { machineName: name })}
      submitKey="machine.convertToTemplateModal.submit"
      busy={busy}
      onClose={onClose}
      onSubmit={() => onSubmit(exportBody({ name, filename, snapshot: picks ? snapshot : '' }))}
    >
      {running && !snapshot ? (
        <div className="alert alert-warning" role="status" data-note="running">
          {t('machine.convertToTemplateModal.runningWarning')}
        </div>
      ) : null}
      <div className="mb-3">
        <label className="form-label" htmlFor="machine-template-filename">
          {t('machine.convertToTemplateModal.filenameLabel')}
        </label>
        <input
          id="machine-template-filename"
          className="form-control"
          type="text"
          placeholder={t('machine.convertToTemplateModal.filenamePlaceholder', {
            machineName: name,
          })}
          value={filename}
          disabled={busy}
          onChange={event => setFilename(event.target.value)}
        />
      </div>
      {picks && snapshots.length > 0 ? (
        <div className="mb-3">
          <label className="form-label" htmlFor="machine-template-snapshot">
            {t('machine.convertToTemplateModal.snapshotLabel')}
          </label>
          <select
            id="machine-template-snapshot"
            className="form-select"
            value={snapshot}
            disabled={busy}
            onChange={event => setSnapshot(event.target.value)}
          >
            <option value="">{t('machine.convertToTemplateModal.currentStateOption')}</option>
            {snapshots.map(row => (
              <option key={snapshotKey(row)} value={row.name}>
                {row.current
                  ? `${row.name} ${t('machine.convertToTemplateModal.currentSuffix')}`
                  : row.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <p className="form-text text-muted mb-0">{t('machine.convertToTemplateModal.publishNote')}</p>
    </ToolFormDialog>
  );
};

MachineTemplateDialog.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  picks: PropTypes.bool.isRequired,
  running: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default MachineTemplateDialog;
