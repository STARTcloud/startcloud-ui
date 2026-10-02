import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaFloppyDisk, FaRotateLeft, FaRotateRight } from 'react-icons/fa6';

/**
 * The actions of the time synchronization configuration,
 * hyperweaver-ui's: Save configuration, held until the text changed
 * and is valid, Reset changes, and Restart service, the save and the
 * restart each opening the confirmation, with the unsaved changes
 * note while the text differs from the file.
 */
const ConfigActions = ({ onSave, onReset, onRestart, hasChanges, valid, busy }) => {
  const { t } = useTranslation();
  return (
    <div data-panel="time-config-actions">
      <h6 className="fw-bold">{t('hostTime.timeSyncConfigActions.heading')}</h6>
      <div className="d-flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          data-action="time-save"
          onClick={onSave}
          disabled={!hasChanges || !valid || busy}
        >
          <FaFloppyDisk className="me-1" aria-hidden="true" />
          {t('hostTime.timeSyncConfigActions.saveConfiguration')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          data-action="time-reset"
          onClick={onReset}
          disabled={!hasChanges || busy}
        >
          <FaRotateLeft className="me-1" aria-hidden="true" />
          {t('hostTime.timeSyncConfigActions.resetChanges')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-warning"
          data-action="time-config-restart"
          onClick={onRestart}
          disabled={busy}
        >
          <FaRotateRight className="me-1" aria-hidden="true" />
          {t('hostTime.timeSyncConfigActions.restartService')}
        </button>
      </div>
      {hasChanges ? (
        <div className="alert alert-info mt-3 mb-0" role="status" data-note="unsaved">
          {t('hostTime.timeSyncConfigActions.unsavedChangesWarning')}
        </div>
      ) : null}
    </div>
  );
};

ConfigActions.propTypes = {
  onSave: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onRestart: PropTypes.func.isRequired,
  hasChanges: PropTypes.bool.isRequired,
  valid: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
};

export default ConfigActions;
