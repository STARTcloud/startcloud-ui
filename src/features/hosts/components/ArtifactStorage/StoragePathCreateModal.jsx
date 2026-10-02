import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../../contexts/StatusContext';
import {
  ARTIFACT_TYPES,
  STORAGE_PATH_FORM,
  storagePathBody,
  storagePathProblem,
} from '../../utils/artifacts';
import { PathInput } from '../PathPicker';
import ToolFormDialog from '../ToolFormDialog';

const TYPE_KEYS = {
  iso: 'artifacts.storagePathCreateModal.isoFiles',
  image: 'artifacts.storagePathCreateModal.vmImages',
};

/**
 * The dialog that makes a storage location, hyperweaver-ui's: the name,
 * the absolute path with Browse, the type, the enabled switch and the
 * notes on what the agent does with it; Create sends
 * `POST artifacts/storage/paths` once.
 */
const StoragePathCreateModal = ({ id, server, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [form, setForm] = useState(STORAGE_PATH_FORM);
  const problem = storagePathProblem(form);

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));

  return (
    <ToolFormDialog
      dialog="storage-path-create"
      title={t('artifacts.storagePathCreateModal.title')}
      submitKey="artifacts.storagePathCreateModal.submitButton"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={() => {
        if (!problem) {
          onSubmit(storagePathBody(form));
        }
      }}
    >
      <div>
        <label htmlFor="storage-path-name" className="form-label">
          {t('artifacts.storagePathCreateModal.nameLabel')}
        </label>
        <input
          id="storage-path-name"
          className="form-control"
          type="text"
          placeholder={t('artifacts.storagePathCreateModal.namePlaceholder')}
          value={form.name}
          onChange={event => set('name', event.target.value)}
          disabled={busy}
        />
        <p className="form-text text-muted mb-0">
          {t('artifacts.storagePathCreateModal.nameHelper')}
        </p>
      </div>
      <div>
        <label htmlFor="storage-path-path" className="form-label">
          {t('artifacts.storagePathCreateModal.pathLabel')}
        </label>
        <PathInput
          id="storage-path-path"
          value={form.path}
          onChange={value => set('path', value)}
          status={status}
          hostId={id}
          server={server}
          disabled={busy}
          placeholder={t('artifacts.storagePathCreateModal.pathPlaceholder')}
        />
        <p className="form-text text-muted mb-0">
          {t('artifacts.storagePathCreateModal.pathHelper')}
        </p>
      </div>
      <div>
        <label htmlFor="storage-path-type" className="form-label">
          {t('artifacts.storagePathCreateModal.typeLabel')}
        </label>
        <select
          id="storage-path-type"
          className="form-select"
          value={form.type}
          onChange={event => set('type', event.target.value)}
          disabled={busy}
        >
          {ARTIFACT_TYPES.map(type => (
            <option key={type} value={type}>
              {t(TYPE_KEYS[type])}
            </option>
          ))}
        </select>
        <p className="form-text text-muted mb-0">
          {t('artifacts.storagePathCreateModal.typeHelper')}
        </p>
      </div>
      <div>
        <div className="form-check">
          <input
            id="storage-path-enabled"
            className="form-check-input"
            type="checkbox"
            checked={form.enabled}
            onChange={event => set('enabled', event.target.checked)}
            disabled={busy}
          />
          <label className="form-check-label" htmlFor="storage-path-enabled">
            {t('artifacts.storagePathCreateModal.enableLabel')}
          </label>
        </div>
        <p className="form-text text-muted mb-0">
          {t('artifacts.storagePathCreateModal.enableHelper')}
        </p>
      </div>
      <div className="alert alert-info mb-0" data-note="storage-path-notes">
        <p className="mb-1">
          <strong>{t('artifacts.storagePathCreateModal.importantHeading')}</strong>
        </p>
        <ul className="mb-0">
          <li>{t('artifacts.storagePathCreateModal.importantNote1')}</li>
          <li>{t('artifacts.storagePathCreateModal.importantNote2')}</li>
          <li>{t('artifacts.storagePathCreateModal.importantNote3')}</li>
        </ul>
      </div>
    </ToolFormDialog>
  );
};

StoragePathCreateModal.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default StoragePathCreateModal;
