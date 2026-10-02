import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

/**
 * The editor of the time synchronization configuration,
 * hyperweaver-ui's: the text of the file, invalid while it names no
 * server or pool line, and the switch that backs the existing file up
 * before it is written.
 */
const ConfigEditor = ({
  configContent,
  setConfigContent,
  backupConfig,
  setBackupConfig,
  valid,
  busy,
}) => {
  const { t } = useTranslation();
  const invalid = Boolean(configContent) && !valid;
  return (
    <div className="mb-3" data-panel="time-config-editor">
      <h6 className="fw-bold">{t('hostTime.timeSyncConfigEditor.heading')}</h6>
      <div className="mb-3">
        <textarea
          id="time-config-content"
          className={`form-control font-monospace${invalid ? ' is-invalid' : ''}`}
          rows="15"
          aria-label={t('hostTime.timeSyncConfigEditor.heading')}
          placeholder={t('hostTime.timeSyncConfigEditor.placeholder')}
          value={configContent}
          onChange={event => setConfigContent(event.target.value)}
          disabled={busy}
        />
        {invalid ? (
          <p className="form-text text-danger">
            {t('hostTime.timeSyncConfigEditor.invalidConfigError')}
          </p>
        ) : null}
      </div>
      <div className="form-check">
        <input
          id="timesync-backup-config"
          className="form-check-input"
          type="checkbox"
          checked={backupConfig}
          onChange={event => setBackupConfig(event.target.checked)}
          disabled={busy}
        />
        <label className="form-check-label" htmlFor="timesync-backup-config">
          {t('hostTime.timeSyncConfigEditor.backupCheckbox')}
        </label>
      </div>
      <p className="form-text text-muted">
        {t('hostTime.timeSyncConfigEditor.backupRecommendation')}
      </p>
    </div>
  );
};

ConfigEditor.propTypes = {
  configContent: PropTypes.string.isRequired,
  setConfigContent: PropTypes.func.isRequired,
  backupConfig: PropTypes.bool.isRequired,
  setBackupConfig: PropTypes.func.isRequired,
  valid: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
};

export default ConfigEditor;
