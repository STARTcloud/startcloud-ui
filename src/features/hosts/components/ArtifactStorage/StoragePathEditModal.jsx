import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatFileSize } from '../../../../utils/formatFileSize';
import { storagePathEditBody, storagePathEditProblem } from '../../utils/artifacts';
import ToolFormDialog from '../ToolFormDialog';

const TYPE_KEYS = {
  iso: 'artifacts.storagePathEditModal.isoFiles',
  image: 'artifacts.storagePathEditModal.vmImages',
};

const Stat = ({ labelKey, value }) => {
  const { t } = useTranslation();
  return (
    <div className="col text-center">
      <p className="text-uppercase small fw-semibold text-muted mb-0">{t(labelKey)}</p>
      <p className="fs-6 fw-bold mb-0">{value}</p>
    </div>
  );
};

Stat.propTypes = {
  labelKey: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
};

/**
 * The dialog that edits a storage location, hyperweaver-ui's: the name,
 * the path and the type read-only, the enabled switch with its
 * sentence, the location's statistics, and the warning of disabling
 * one that holds files; Save sends `PUT artifacts/storage/paths/{id}`
 * once.
 */
const StoragePathEditModal = ({ storagePath, busy, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: storagePath.name || '',
    enabled: storagePath.enabled ?? true,
  });
  const problem = storagePathEditProblem(form);

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));

  return (
    <ToolFormDialog
      dialog="storage-path-edit"
      title={t('artifacts.storagePathEditModal.title')}
      submitKey="artifacts.storagePathEditModal.submitButton"
      problemKey={problem}
      busy={busy}
      onClose={onClose}
      onSubmit={() => {
        if (!problem) {
          onSubmit(storagePathEditBody(form));
        }
      }}
    >
      <div>
        <label htmlFor="edit-storage-path-name" className="form-label">
          {t('artifacts.storagePathEditModal.nameLabel')}
        </label>
        <input
          id="edit-storage-path-name"
          className="form-control"
          type="text"
          placeholder={t('artifacts.storagePathEditModal.namePlaceholder')}
          value={form.name}
          onChange={event => set('name', event.target.value)}
          disabled={busy}
        />
        <p className="form-text text-muted mb-0">
          {t('artifacts.storagePathEditModal.nameHelper')}
        </p>
      </div>
      <div>
        <label htmlFor="edit-storage-path-path" className="form-label">
          {t('artifacts.storagePathEditModal.pathLabel')}
        </label>
        <input
          id="edit-storage-path-path"
          className="form-control"
          type="text"
          value={storagePath.path}
          disabled
          readOnly
        />
        <p className="form-text text-muted mb-0">
          {t('artifacts.storagePathEditModal.pathHelper')}
        </p>
      </div>
      <div>
        <label htmlFor="edit-storage-path-type" className="form-label">
          {t('artifacts.storagePathEditModal.typeLabel')}
        </label>
        <select
          id="edit-storage-path-type"
          className="form-select"
          value={storagePath.type}
          disabled
        >
          {Object.entries(TYPE_KEYS).map(([type, key]) => (
            <option key={type} value={type}>
              {t(key)}
            </option>
          ))}
        </select>
        <p className="form-text text-muted mb-0">
          {t('artifacts.storagePathEditModal.typeHelper')}
        </p>
      </div>
      <div>
        <div className="form-check">
          <input
            id="edit-storage-path-enabled"
            className="form-check-input"
            type="checkbox"
            checked={form.enabled}
            onChange={event => set('enabled', event.target.checked)}
            disabled={busy}
          />
          <label className="form-check-label" htmlFor="edit-storage-path-enabled">
            {t('artifacts.storagePathEditModal.enableLabel')}
          </label>
        </div>
        <p className="form-text text-muted mb-0">
          {t(
            form.enabled
              ? 'artifacts.storagePathEditModal.enabledDescription'
              : 'artifacts.storagePathEditModal.disabledDescription'
          )}
        </p>
      </div>
      <div className="alert alert-secondary mb-0" data-note="storage-path-stats">
        <p className="mb-2">
          <strong>{t('artifacts.storagePathEditModal.storageStatisticsHeading')}</strong>
        </p>
        <div className="row">
          <Stat
            labelKey="artifacts.storagePathEditModal.filesLabel"
            value={storagePath.file_count || 0}
          />
          <Stat
            labelKey="artifacts.storagePathEditModal.totalSizeLabel"
            value={formatFileSize(storagePath.total_size)}
          />
          {storagePath.disk_usage ? (
            <Stat
              labelKey="artifacts.storagePathEditModal.diskUsageLabel"
              value={storagePath.disk_usage.use_percent}
            />
          ) : null}
        </div>
      </div>
      {!form.enabled && storagePath.file_count > 0 ? (
        <div className="alert alert-warning mb-0" data-note="disable-warning">
          <strong>{t('artifacts.storagePathEditModal.disableWarningHeading')}</strong>{' '}
          {t('artifacts.storagePathEditModal.disableWarningMessage', {
            count: storagePath.file_count,
          })}
        </div>
      ) : null}
    </ToolFormDialog>
  );
};

StoragePathEditModal.propTypes = {
  storagePath: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default StoragePathEditModal;
