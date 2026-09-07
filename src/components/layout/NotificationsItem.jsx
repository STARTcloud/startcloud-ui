import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBell } from 'react-icons/fa6';

import { useStatus } from '../../contexts/StatusContext';
import { useUnread } from '../../features/notifications/context/UnreadContext';
import { useEventStream } from '../../hooks/useEventStream';
import { hasFeature } from '../../utils/capabilities';

import NotificationsModal, {
  notificationsAdapterShape,
  pushAdapterShape,
} from './NotificationsModal';

const UNREAD_POLL_MS = 60000;

const countOf = data => Math.max(0, Number(data?.count) || 0);

const streamsUnread = status =>
  hasFeature(status, 'events') && Boolean(status.events?.topics?.includes('notifications'));

/**
 * The user menu's Notifications row: the bell with the unread badge from
 * the notifications feature's one context, read once on mount from the
 * adapter's `unreadCount()`, corrected by the `notifications` topic's
 * `unread-count` event where the host streams it and polled every 60 s
 * only where it does not, and the modal it opens.
 */
const NotificationsItem = ({
  notifications,
  push,
  viewAllUrl = '',
  viewAllTo = '',
  LinkComponent = 'a',
}) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { unread, set, adjust } = useUnread();
  const [show, setShow] = useState(false);
  const streaming = streamsUnread(status);

  useEffect(() => {
    const load = () => {
      notifications
        .unreadCount()
        .then(data => set(countOf(data)))
        .catch(() => null);
    };
    load();
    if (streaming) {
      return undefined;
    }
    const interval = setInterval(load, UNREAD_POLL_MS);
    return () => clearInterval(interval);
  }, [notifications, set, streaming]);

  useEventStream('unread-count', data => set(countOf(data)));

  return (
    <>
      <Dropdown.Item
        as="button"
        type="button"
        onClick={() => setShow(true)}
        className="d-flex align-items-center"
      >
        <FaBell className="me-2" />
        <span className="flex-grow-1">{t('inbox.title')}</span>
        {unread > 0 ? <span className="badge rounded-pill bg-danger ms-2">{unread}</span> : null}
      </Dropdown.Item>
      <NotificationsModal
        show={show}
        onHide={() => setShow(false)}
        onUnreadDelta={adjust}
        notifications={notifications}
        push={push}
        viewAllUrl={viewAllUrl}
        viewAllTo={viewAllTo}
        LinkComponent={LinkComponent}
      />
    </>
  );
};

NotificationsItem.propTypes = {
  notifications: notificationsAdapterShape.isRequired,
  push: pushAdapterShape.isRequired,
  viewAllUrl: PropTypes.string,
  viewAllTo: PropTypes.string,
  LinkComponent: PropTypes.elementType,
};

export default NotificationsItem;
