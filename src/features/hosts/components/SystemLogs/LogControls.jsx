import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaRotate, FaSatelliteDish, FaStop } from 'react-icons/fa6';

import { isFaultManagerLog } from '../../utils/logs';

/**
 * The controls of the log viewer, hyperweaver-ui's: the lines, the grep,
 * the since and the tail, Refresh, and Live stream or Stop stream, held
 * for a fault manager log, which cannot be streamed. hyperweaver-ui's
 * Auto button and its five-second timer are not carried over.
 */
const LogControls = ({
  filters,
  onFilterChange,
  onRefresh,
  busy,
  streaming,
  onToggleStreaming,
  selectedLog,
}) => {
  const { t } = useTranslation();
  const faultManager = isFaultManagerLog(selectedLog);
  const streamTitle = () => {
    if (faultManager) {
      return t('host.logControls.streamingUnavailable');
    }
    return t(
      streaming ? 'host.logControls.stopStreamingTitle' : 'host.logControls.startStreamingTitle'
    );
  };
  const StreamIcon = streaming ? FaStop : FaSatelliteDish;

  return (
    <div className="row g-2 align-items-end mb-3" data-panel="log-controls">
      <div className="col-6 col-lg-2">
        <label className="form-label" htmlFor="log-lines">
          {t('host.logControls.lines')}
        </label>
        <input
          id="log-lines"
          className="form-control form-control-sm"
          type="number"
          min="10"
          max="1000"
          value={filters.lines}
          onChange={event => onFilterChange('lines', Number.parseInt(event.target.value, 10) || 0)}
        />
      </div>
      <div className="col-6 col-lg-3">
        <label className="form-label" htmlFor="log-grep">
          {t('host.logControls.filterGrep')}
        </label>
        <input
          id="log-grep"
          className="form-control form-control-sm"
          type="text"
          placeholder={t('host.logControls.filterPlaceholder')}
          value={filters.grep}
          onChange={event => onFilterChange('grep', event.target.value)}
        />
      </div>
      <div className="col-6 col-lg-3">
        <label className="form-label" htmlFor="log-since">
          {t('host.logControls.since')}
        </label>
        <input
          id="log-since"
          className="form-control form-control-sm"
          type="datetime-local"
          value={filters.since}
          onChange={event => onFilterChange('since', event.target.value)}
        />
      </div>
      <div className="col-6 col-lg-1">
        <div className="form-check">
          <input
            id="log-tail"
            className="form-check-input"
            type="checkbox"
            checked={filters.tail}
            onChange={event => onFilterChange('tail', event.target.checked)}
          />
          <label className="form-check-label" htmlFor="log-tail">
            {t('host.logControls.latest')}
          </label>
        </div>
      </div>
      <div className="col-auto d-flex gap-2">
        <button
          type="button"
          className="btn btn-sm btn-info"
          data-action="log-refresh"
          onClick={onRefresh}
          disabled={busy}
        >
          <FaRotate className="me-1" aria-hidden="true" />
          {t('host.logControls.refresh')}
        </button>
        <button
          type="button"
          className={`btn btn-sm btn-${streaming ? 'primary' : 'warning'}`}
          data-action="log-stream"
          onClick={onToggleStreaming}
          disabled={busy || faultManager}
          title={streamTitle()}
        >
          <StreamIcon className="me-1" aria-hidden="true" />
          {t(streaming ? 'host.logControls.stopStream' : 'host.logControls.liveStream')}
        </button>
      </div>
    </div>
  );
};

LogControls.propTypes = {
  filters: PropTypes.shape({
    lines: PropTypes.number,
    grep: PropTypes.string,
    since: PropTypes.string,
    tail: PropTypes.bool,
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
  streaming: PropTypes.bool.isRequired,
  onToggleStreaming: PropTypes.func.isRequired,
  selectedLog: PropTypes.object,
};

export default LogControls;
