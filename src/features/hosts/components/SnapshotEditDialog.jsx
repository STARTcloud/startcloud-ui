import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { modifyBody } from '../utils/snapshots';

import ToolFormDialog from './ToolFormDialog';

/**
 * The dialog that renames one snapshot or writes its description,
 * hyperweaver-ui's edit form, a form dialog: the new name, left empty to
 * keep the name, and the description, emptied to clear it. Save hands
 * `onSave` the body of the one request, the members that changed alone;
 * while nothing changed the dialog says so and sends nothing.
 */
const SnapshotEditDialog = ({ snapshot, busy, onClose, onSave }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    newName: '',
    description: typeof snapshot.description === 'string' ? snapshot.description : '',
  });
  const [problem, setProblem] = useState('');

  const change = patch => {
    setForm(current => ({ ...current, ...patch }));
    setProblem('');
  };

  const submit = () => {
    const body = modifyBody(form, snapshot);
    setProblem(body ? '' : 'machine.machineSnapshots.editNothingChanged');
    if (body) {
      onSave(body);
    }
  };

  return (
    <ToolFormDialog
      dialog="snapshot-edit"
      title={t('machine.machineSnapshots.editSnapshotTitle', { snapshotName: snapshot.name })}
      submitKey="machine.machineSnapshots.saveSubmit"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="mb-3">
        <label className="form-label" htmlFor="snapshot-edit-name">
          {t('machine.machineSnapshots.newNamePrefix')} <code>{snapshot.name}</code>
          {t('machine.machineSnapshots.newNameSuffix')}
        </label>
        <input
          id="snapshot-edit-name"
          className="form-control"
          type="text"
          value={form.newName}
          disabled={busy}
          onChange={event => change({ newName: event.target.value })}
        />
        <p className="form-text text-muted mb-0">
          {t('machine.machineSnapshots.renameCollisionNote')}
        </p>
      </div>
      <div>
        <label className="form-label" htmlFor="snapshot-edit-description">
          {t('machine.machineSnapshots.clearDescriptionLabel')}
        </label>
        <input
          id="snapshot-edit-description"
          className="form-control"
          type="text"
          value={form.description}
          disabled={busy}
          onChange={event => change({ description: event.target.value })}
        />
      </div>
    </ToolFormDialog>
  );
};

SnapshotEditDialog.propTypes = {
  snapshot: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default SnapshotEditDialog;
