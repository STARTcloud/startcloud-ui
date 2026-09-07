import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  FaArrowUpRightFromSquare,
  FaBell,
  FaCheck,
  FaEnvelope,
  FaGear,
  FaShieldHalved,
  FaTriangleExclamation,
  FaXmark,
} from 'react-icons/fa6';

import { followableUrl } from '../../../components/common/MethodList';
import { formatRelativeTime } from '../../../utils/relativeTime';

const TYPE_ICONS = {
  SECURITY: FaShieldHalved,
  OAUTH: FaShieldHalved,
  ACCOUNT: FaEnvelope,
  ADMIN: FaGear,
  SYSTEM: FaGear,
  MESSAGE: FaEnvelope,
  ALERT: FaTriangleExclamation,
};

const SEVERITY_CLASSES = {
  DANGER: 'text-danger',
  CRITICAL: 'text-danger',
  ERROR: 'text-danger',
  WARNING: 'text-warning',
  SUCCESS: 'text-success',
  INFO: 'text-body-secondary',
};

export const notificationShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  title: PropTypes.string,
  body: PropTypes.string,
  type: PropTypes.string,
  severity: PropTypes.string,
  navigate: PropTypes.string,
  createdAt: PropTypes.string,
  readAt: PropTypes.string,
});

/**
 * The rows the hub answers, the `items` of its paged shape.
 * @param {Object} data - The answer of the inbox `list` call
 * @returns {Array<Object>} The rows
 */
export const extractEntries = data => (Array.isArray(data?.items) ? data.items : []);

/**
 * The link a row's `navigate` carries when the page may follow it: an
 * `https:` URL or a same-origin path.
 * @param {Object} entry - The row
 * @returns {string} The link, or empty
 */
export const linkOf = entry => followableUrl(entry?.navigate);

const absoluteTime = (value, language) => {
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? '' : time.toLocaleString(language);
};

/**
 * One notification row: the type icon coloured by severity, the title
 * (bold while unread, with the open-in glyph when the row carries a link
 * the page may follow), the body, the relative time with the absolute
 * time in its tooltip, the unread dot, and the mark-read and delete
 * controls.
 */
export const NotificationRow = ({ entry, onSelect, onMarkRead, onDismiss, labels }) => {
  const { i18n } = useTranslation();
  const Icon = TYPE_ICONS[entry.type] || FaBell;
  const unread = !entry.readAt;

  return (
    <div className="notification-row">
      <button
        type="button"
        className="dropdown-item notification-item"
        onClick={() => onSelect(entry)}
      >
        <Icon
          className={`notification-item-icon ${SEVERITY_CLASSES[entry.severity] || 'text-body-secondary'}`}
        />
        <span className="notification-item-body">
          <span className={`notification-item-title ${unread ? 'fw-semibold' : ''}`}>
            {entry.title}
            {linkOf(entry) ? (
              <FaArrowUpRightFromSquare className="ms-1 small text-body-secondary" aria-hidden />
            ) : null}
          </span>
          {entry.body ? <span className="notification-item-text">{entry.body}</span> : null}
          <span
            className="notification-item-time"
            title={absoluteTime(entry.createdAt, i18n.language)}
          >
            {formatRelativeTime(entry.createdAt, i18n.language)}
          </span>
        </span>
        {unread ? <span className="notification-item-dot" /> : null}
      </button>
      <span className="notification-tools">
        {labels.viewDetails && linkOf(entry) ? (
          <button type="button" className="btn btn-sm" onClick={() => onSelect(entry)}>
            {labels.viewDetails}
          </button>
        ) : null}
        {unread ? (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => onMarkRead(entry)}
            title={labels.markRead}
            aria-label={labels.markRead}
          >
            <FaCheck />
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => onDismiss(entry)}
          title={labels.dismiss}
          aria-label={labels.dismiss}
        >
          <FaXmark />
        </button>
      </span>
    </div>
  );
};

NotificationRow.propTypes = {
  entry: notificationShape.isRequired,
  onSelect: PropTypes.func.isRequired,
  onMarkRead: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
  labels: PropTypes.shape({
    markRead: PropTypes.string.isRequired,
    dismiss: PropTypes.string.isRequired,
    viewDetails: PropTypes.string,
  }).isRequired,
};

/**
 * The row list the notifications modal and the inbox page both draw:
 * the same `NotificationRow` per entry, the caller owning the entries,
 * the selection, the mark-read and the delete, and the words the two
 * row controls carry.
 */
const InboxList = ({ entries, onSelect, onMarkRead, onDismiss, labels }) => (
  <div className="notification-list">
    {entries.map(entry => (
      <NotificationRow
        key={entry.id}
        entry={entry}
        onSelect={onSelect}
        onMarkRead={onMarkRead}
        onDismiss={onDismiss}
        labels={labels}
      />
    ))}
  </div>
);

InboxList.propTypes = {
  entries: PropTypes.arrayOf(notificationShape).isRequired,
  onSelect: PropTypes.func.isRequired,
  onMarkRead: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
  labels: PropTypes.shape({
    markRead: PropTypes.string.isRequired,
    dismiss: PropTypes.string.isRequired,
    viewDetails: PropTypes.string,
  }).isRequired,
};

export default InboxList;
