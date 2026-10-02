import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCircleCheck, FaFloppyDisk, FaRotateRight } from 'react-icons/fa6';

import { getValidationColor } from '../../utils/syslogUtils';

const Spinner = () => (
  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
);

/**
 * The syslog configuration editor, hyperweaver-ui's: the text of the
 * configuration file, the validation's errors, warnings and parsed rule
 * count under it, and Validate, Apply and Reload, each one request.
 */
const ConfigEditorView = ({
  configContent,
  setConfigContent,
  validation,
  busy,
  validating,
  validateConfiguration,
  applyConfiguration,
  reloadSyslog,
}) => {
  const { t } = useTranslation();
  const held = busy || validating;

  return (
    <div data-panel="syslog-editor">
      <div className="mb-3">
        <label className="form-label" htmlFor="syslog-config-editor">
          {t('hostTime.syslogConfigEditor.contentLabel')}
        </label>
        <textarea
          id="syslog-config-editor"
          className="form-control font-monospace small"
          rows="20"
          value={configContent}
          onChange={event => setConfigContent(event.target.value)}
          placeholder={t('hostTime.syslogConfigEditor.placeholder')}
          disabled={busy}
        />
        <p className="form-text text-muted">{t('hostTime.syslogConfigEditor.helpText')}</p>
      </div>

      {validation ? (
        <div
          className={`alert alert-${getValidationColor(validation.errors, validation.warnings)}`}
          data-note="syslog-validation"
        >
          <h6 className="fw-bold">{t('hostTime.syslogConfigEditor.validationResultsHeading')}</h6>
          {validation.errors?.length > 0 ? (
            <div>
              <p className="fw-semibold text-danger mb-1">
                {t('hostTime.syslogConfigEditor.errorsLabel')}
              </p>
              <ul>
                {validation.errors.map(error => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {validation.warnings?.length > 0 ? (
            <div>
              <p className="fw-semibold text-warning mb-1">
                {t('hostTime.syslogConfigEditor.warningsLabel')}
              </p>
              <ul>
                {validation.warnings.map(warning => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {validation.parsed_rules?.length > 0 ? (
            <p className="small mb-0">
              {t('hostTime.syslogConfigEditor.rulesActiveMessage', {
                count: validation.parsed_rules.length,
              })}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="d-flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm btn-info"
          data-action="syslog-validate"
          onClick={validateConfiguration}
          disabled={held || !configContent.trim()}
        >
          {validating ? <Spinner /> : <FaCircleCheck className="me-1" aria-hidden="true" />}
          {t('hostTime.syslogConfigEditor.validateButton')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          data-action="syslog-apply"
          onClick={applyConfiguration}
          disabled={held || !configContent.trim()}
        >
          {busy ? <Spinner /> : <FaFloppyDisk className="me-1" aria-hidden="true" />}
          {t('hostTime.syslogConfigEditor.applyButton')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-warning"
          data-action="syslog-reload"
          onClick={reloadSyslog}
          disabled={held}
        >
          {busy ? <Spinner /> : <FaRotateRight className="me-1" aria-hidden="true" />}
          {t('hostTime.syslogConfigEditor.reloadButton')}
        </button>
      </div>
    </div>
  );
};

ConfigEditorView.propTypes = {
  configContent: PropTypes.string.isRequired,
  setConfigContent: PropTypes.func.isRequired,
  validation: PropTypes.object,
  busy: PropTypes.bool.isRequired,
  validating: PropTypes.bool.isRequired,
  validateConfiguration: PropTypes.func.isRequired,
  applyConfiguration: PropTypes.func.isRequired,
  reloadSyslog: PropTypes.func.isRequired,
};

export default ConfigEditorView;
