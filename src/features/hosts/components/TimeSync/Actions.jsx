import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaRotate, FaRotateRight } from 'react-icons/fa6';

/**
 * The quick actions of the time synchronization, hyperweaver-ui's:
 * Force sync now and Restart service, each opening the confirmation,
 * both held while the service is not available or a request is in
 * flight; hyperweaver-ui's Refresh status is the page's own Refresh.
 */
const TimeSyncActions = ({ onAction, busy, statusAvailable }) => {
  const { t } = useTranslation();
  return (
    <div className="d-flex flex-wrap gap-2 mb-3" data-panel="time-actions">
      <button
        type="button"
        className="btn btn-sm btn-primary"
        data-action="time-sync"
        onClick={() => onAction('sync')}
        disabled={!statusAvailable || busy}
      >
        <FaRotate className="me-1" aria-hidden="true" />
        {t('hostTime.timeSyncActions.forceSyncNow')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-warning"
        data-action="time-restart"
        onClick={() => onAction('restart')}
        disabled={!statusAvailable || busy}
      >
        <FaRotateRight className="me-1" aria-hidden="true" />
        {t('hostTime.timeSyncActions.restartService')}
      </button>
    </div>
  );
};

TimeSyncActions.propTypes = {
  onAction: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
  statusAvailable: PropTypes.bool.isRequired,
};

export default TimeSyncActions;
