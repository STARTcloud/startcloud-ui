import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaArrowsRotate } from 'react-icons/fa6';

import { formatRelativeTime } from '../../../utils/relativeTime';
import { SINCE_OPTIONS } from '../hooks/useVmHistory';
import { eventDisplay } from '../utils/eventTypes';

export const historyShape = PropTypes.shape({
  since: PropTypes.string.isRequired,
  setSince: PropTypes.func.isRequired,
  events: PropTypes.array.isRequired,
  stats: PropTypes.object,
  loading: PropTypes.bool.isRequired,
  failed: PropTypes.bool.isRequired,
  refresh: PropTypes.func.isRequired,
});

const parseDetails = details => {
  if (!details) {
    return {};
  }
  try {
    return JSON.parse(details) || {};
  } catch {
    return {};
  }
};

const detailOf = (event, t) => {
  const parts = [];
  if (event.old_value && event.new_value) {
    parts.push(`${event.old_value} → ${event.new_value}`);
  } else if (event.new_value) {
    parts.push(event.new_value);
  } else if (event.old_value) {
    parts.push(t('vdi.events.was', { value: event.old_value }));
  }
  const details = parseDetails(event.details);
  if (details.unc_path) {
    parts.push(`(${details.unc_path})`);
  }
  if (details.latency_ms) {
    parts.push(`${details.latency_ms}ms`);
  }
  if (details.idle_minutes) {
    parts.push(`(${details.idle_minutes}min)`);
  }
  if (details.reboot_process) {
    parts.push(t('vdi.events.initiatedBy', { process: details.reboot_process }));
  }
  return parts.join(' ');
};

const TimelineEvent = ({ event }) => {
  const { t, i18n } = useTranslation();
  const { Icon, className, label } = eventDisplay(event.event_type, t);
  const detail = detailOf(event, t);
  const who = event.username ? event.username.split('\\').pop() : '';
  return (
    <div className="d-flex gap-3 py-2 border-bottom small">
      <Icon className={`${className} fs-5 flex-shrink-0 mt-1`} aria-hidden />
      <div className="flex-grow-1 min-width-0">
        <div className="fw-semibold">
          {label}
          {who ? ` — ${who}` : ''}
        </div>
        <div className="text-body-secondary">
          {new Date(event.timestamp).toLocaleString(i18n.language)} (
          {formatRelativeTime(event.timestamp, i18n.language)})
        </div>
        {detail ? <div className="text-body-secondary">{detail}</div> : null}
      </div>
    </div>
  );
};

TimelineEvent.propTypes = {
  event: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    event_type: PropTypes.string.isRequired,
    timestamp: PropTypes.string.isRequired,
    username: PropTypes.string,
    old_value: PropTypes.string,
    new_value: PropTypes.string,
    details: PropTypes.string,
  }).isRequired,
};

const eventKey = event =>
  event.id ?? `${event.timestamp}:${event.event_type}:${event.old_value}:${event.new_value}`;

/**
 * The event history of one VM: the window select and the refresh button,
 * then the timeline newest first, each event with its glyph, label, the
 * user it names, its time and the detail its values and details carry.
 */
const VmHistory = ({ history }) => {
  const { t } = useTranslation();
  const body = () => {
    if (history.failed) {
      return <div className="text-danger">{t('vdi.history.failed')}</div>;
    }
    if (history.loading) {
      return <div className="text-body-secondary">{t('vdi.history.loading')}</div>;
    }
    if (history.events.length === 0) {
      return <div className="text-body-secondary">{t('vdi.events.none')}</div>;
    }
    return (
      <div className="vdi-timeline">
        {history.events.map(event => (
          <TimelineEvent key={eventKey(event)} event={event} />
        ))}
      </div>
    );
  };
  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-3">
        <select
          className="form-select form-select-sm w-auto"
          value={history.since}
          onChange={event => history.setSince(event.target.value)}
          aria-label={t('vdi.history.window')}
        >
          {SINCE_OPTIONS.map(option => (
            <option key={option} value={option}>
              {t(`vdi.history.since.${option}`)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
          onClick={history.refresh}
        >
          <FaArrowsRotate aria-hidden />
          {t('vdi.history.refresh')}
        </button>
      </div>
      {body()}
    </div>
  );
};

VmHistory.propTypes = {
  history: historyShape.isRequired,
};

export default VmHistory;
