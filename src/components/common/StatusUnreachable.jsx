import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

/**
 * The page the entry draws when `GET /api/status` answers no payload (a
 * proxy 502, a network error): the shared empty-state card with the
 * `status.unreachable` sentence and a Retry button that probes the status
 * again and boots the app when it answers; no chrome, because the chrome
 * is drawn from the status payload and there is none.
 */
const StatusUnreachable = ({ onRetry }) => {
  const { t } = useTranslation();
  return (
    <div className="container-fluid py-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <div className="alert alert-warning" role="alert">
                <p className="mb-0">{t('status.unreachable')}</p>
              </div>
              <button type="button" className="btn btn-primary" onClick={onRetry}>
                {t('status.retry')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

StatusUnreachable.propTypes = {
  onRetry: PropTypes.func.isRequired,
};

export default StatusUnreachable;
