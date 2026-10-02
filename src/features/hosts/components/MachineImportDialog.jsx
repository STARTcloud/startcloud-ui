import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { importBody } from '../utils/machineTools';

import ToolFormDialog from './ToolFormDialog';

/**
 * The dialog that imports an appliance as a machine, hyperweaver-ui's
 * import form, a form dialog: the path of the `.ova` or `.ovf` on the
 * host, which is required, and the machine's name, the appliance's own
 * where none is given. Import hands `onSubmit` the body of the one
 * request; a form without a path says so and sends nothing.
 */
const MachineImportDialog = ({ busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [path, setPath] = useState('');
  const [name, setName] = useState('');
  const [problem, setProblem] = useState('');

  const submit = () => {
    const given = Boolean(path.trim());
    setProblem(given ? '' : 'machine.importMachineModal.pathRequired');
    if (given) {
      onSubmit(importBody({ path, name }));
    }
  };

  return (
    <ToolFormDialog
      dialog="machine-import"
      title={t('machine.importMachineModal.title')}
      submitKey="machine.importMachineModal.submit"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="mb-3">
        <label className="form-label" htmlFor="machine-import-path">
          {t('machine.importMachineModal.pathLabel')}{' '}
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        </label>
        <input
          id="machine-import-path"
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
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="machine-import-name">
          {t('machine.importMachineModal.nameLabel')}
        </label>
        <input
          id="machine-import-name"
          className="form-control"
          type="text"
          placeholder={t('machine.importMachineModal.namePlaceholder')}
          value={name}
          disabled={busy}
          onChange={event => setName(event.target.value)}
        />
      </div>
    </ToolFormDialog>
  );
};

MachineImportDialog.propTypes = {
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default MachineImportDialog;
