import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCircleCheck, FaFloppyDisk, FaRotateLeft } from 'react-icons/fa6';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { useStatus } from '../../../contexts/StatusContext';
import { useArcConfig } from '../hooks/useArcConfig';
import { getValidationColor } from '../utils/arcUtils';

import ArcStatusSection from './ArcConfiguration/ArcStatusSection';
import HelpSection from './ArcConfiguration/HelpSection';
import MemoryParametersSection from './ArcConfiguration/MemoryParametersSection';
import PerformanceSection from './ArcConfiguration/PerformanceSection';
import TaskDialog from './TaskDialog';

const Spinner = () => (
  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
);

const Validation = ({ validation }) => {
  const { t } = useTranslation();
  const proposed = validation.proposed_settings;
  return (
    <div
      className={`alert alert-${getValidationColor(validation.errors, validation.warnings)}`}
      data-note="arc-validation"
    >
      <h6 className="fw-bold">{t('hostCharts.arcConfiguration.validationResultsTitle')}</h6>
      {validation.errors?.length > 0 ? (
        <div>
          <p className="fw-semibold text-danger mb-1">
            {t('hostCharts.arcConfiguration.errorsLabel')}:
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
            {t('hostCharts.arcConfiguration.warningsLabel')}:
          </p>
          <ul>
            {validation.warnings.map(warning => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {proposed ? (
        <div>
          <p className="fw-semibold mb-1">
            {t('hostCharts.arcConfiguration.proposedSettingsLabel')}:
          </p>
          <div className="d-flex flex-wrap gap-2">
            {proposed.arc_max_gb ? (
              <span className="badge text-bg-info">Max: {proposed.arc_max_gb} GB</span>
            ) : null}
            {proposed.arc_min_gb ? (
              <span className="badge text-bg-info">Min: {proposed.arc_min_gb} GB</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

Validation.propTypes = {
  validation: PropTypes.object.isRequired,
};

/**
 * The ZFS ARC configuration of a host, hyperweaver-ui's
 * `ArcConfiguration` as the body of the Manage page's ARC configuration
 * section: the current status, the memory and the performance
 * parameters as sliders, the validation's answer, Validate, Apply and
 * Reset to defaults behind the typed confirmation, and the help. Every
 * write is one request and one notice, the configuration read again on
 * a success. Nothing polls.
 */
const ArcConfigurationSection = ({ id }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const arc = useArcConfig(id);
  const held = arc.busy || arc.validating;
  const resetMessage = (
    <p className="mb-0" data-dialog="arc-reset">
      {t('hostCharts.arcConfiguration.resetConfirmMessage')}
    </p>
  );

  return (
    <div data-panel="arc-configuration">
      {arc.reading.loaded ? null : <p>{t('hostCharts.arcConfiguration.loadingMessage')}</p>}
      {arc.reading.failed ? (
        <div className="alert alert-danger" role="alert">
          {t('hosts.overview.readError')}
        </div>
      ) : null}
      <ArcStatusSection currentConfig={arc.currentConfig} />
      <div className="card" data-panel="arc-form">
        <div className="card-body">
          <h6 className="fw-bold">{t('hostCharts.arcConfiguration.configurationTitle')}</h6>
          <MemoryParametersSection
            formData={arc.formData}
            currentConfig={arc.currentConfig}
            busy={held}
            handleFormChange={arc.handleFormChange}
          />
          <PerformanceSection
            formData={arc.formData}
            busy={held}
            handleFormChange={arc.handleFormChange}
          />
          {arc.validation ? <Validation validation={arc.validation} /> : null}
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm btn-info"
              data-action="arc-validate"
              onClick={arc.validateConfiguration}
              disabled={held || !arc.canValidate}
            >
              {arc.validating ? <Spinner /> : <FaCircleCheck className="me-1" aria-hidden="true" />}
              {t('hostCharts.arcConfiguration.validateButtonLabel')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              data-action="arc-apply"
              onClick={arc.applyConfiguration}
              disabled={held || !arc.canApply}
            >
              {arc.busy ? <Spinner /> : <FaFloppyDisk className="me-1" aria-hidden="true" />}
              {t('hostCharts.arcConfiguration.applyButtonLabel')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-warning"
              data-action="arc-reset"
              onClick={arc.requestResetToDefaults}
              disabled={held}
            >
              <FaRotateLeft className="me-1" aria-hidden="true" />
              {t('hostCharts.arcConfiguration.resetButtonLabel')}
            </button>
          </div>
        </div>
      </div>
      <HelpSection />
      <ConfirmModal
        show={arc.showResetConfirm}
        handleClose={arc.cancelReset}
        handleConfirm={arc.confirmResetToDefaults}
        title={t('hostCharts.arcConfiguration.resetConfirmTitle')}
        message={resetMessage}
        confirmText={t('hostCharts.arcConfiguration.resetConfirmButtonLabel')}
        variant="restart"
        keyword="reset"
      />
      {arc.task ? (
        <TaskDialog status={status} id={id} task={arc.task.row} onHide={arc.closeTask} />
      ) : null}
    </div>
  );
};

ArcConfigurationSection.propTypes = {
  id: PropTypes.string.isRequired,
};

export default ArcConfigurationSection;
