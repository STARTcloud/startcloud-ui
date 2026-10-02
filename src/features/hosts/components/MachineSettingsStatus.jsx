import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaRotate } from 'react-icons/fa6';

import ResourceIssues from './ResourceIssues';

/**
 * The status stack over the Settings form, hyperweaver-ui's: the resource
 * issues an agent short of resources refused with; the choice a running
 * machine gets, stop, apply and start, apply at the next power cycle, or
 * back; and the working line with its step while a request is in flight.
 */
const MachineSettingsStatus = ({ issues, phase, step = '', name, onRestart, onQueue, onBack }) => {
  const { t } = useTranslation();
  return (
    <>
      {issues.length > 0 ? <ResourceIssues issues={issues} /> : null}
      {phase === 'choice' ? (
        <div className="alert alert-warning" role="alert" data-note="running-choice">
          <p className="fw-bold mb-2">
            {t('machine.machineSettingsStatus.runningWarning', { machineName: name })}
          </p>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm btn-warning"
              data-action="stop-apply-start"
              onClick={onRestart}
            >
              <FaRotate className="me-2" aria-hidden="true" />
              {t('machine.machineSettingsStatus.stopApplyStart')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              data-action="apply-next-cycle"
              onClick={onQueue}
            >
              {t('machine.machineSettingsStatus.applyNextCycle')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              data-action="back"
              onClick={onBack}
            >
              {t('machine.machineSettingsStatus.back')}
            </button>
          </div>
        </div>
      ) : null}
      {phase === 'working' ? (
        <div
          className="alert alert-info d-flex align-items-center gap-2"
          role="status"
          data-note="working"
        >
          <span className="spinner-border spinner-border-sm" aria-hidden="true" />
          <span>{step || t('machine.machineSettingsStatus.working')}</span>
        </div>
      ) : null}
    </>
  );
};

MachineSettingsStatus.propTypes = {
  issues: PropTypes.array.isRequired,
  phase: PropTypes.oneOf(['form', 'choice', 'working']).isRequired,
  step: PropTypes.string,
  name: PropTypes.string.isRequired,
  onRestart: PropTypes.func.isRequired,
  onQueue: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};

export default MachineSettingsStatus;
