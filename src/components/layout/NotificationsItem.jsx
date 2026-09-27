import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBell } from 'react-icons/fa6';

import { useStatus } from '../../contexts/StatusContext';
import { useUnread } from '../../contexts/UnreadContext';
import { useEventStream } from '../../hooks/useEventStream';
import { hasFeature } from '../../utils/capabilities';

import NotificationsModal, {
  notificationsAdapterShape,
  pushAdapterShape,
} from './NotificationsModal';

const countOf = data => Math.max(0, Number(data?.count) || 0);

const streamsUnread = status =>
  hasFeature(status, 'events') && Boolean(status.events?.topics?.includes('notifications'));

/**
 * The user menu's Notifications row: the bell with the unread badge from
 * the notifications feature's one context, read from the adapter's
 * `unreadCount()` as the row draws in the menu, corrected by the
 * `notifications` topic's `unread-count` event where the host streams
 * it, and where it does not read again when the person opens the modal
 * and after the person's own read or dismiss; no timer runs. The row
 * opens the modal.
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

  const load = useCallback(() => {
    notifications
      .unreadCount()
      .then(data => set(countOf(data)))
      .catch(() => null);
  }, [notifications, set]);

  useEffect(() => {
    load();
  }, [load]);

  useEventStream('unread-count', data => set(countOf(data)));

  const open = () => {
    setShow(true);
    if (!streaming) {
      load();
    }
  };

  const onUnreadDelta = delta => {
    adjust(delta);
    if (!streaming) {
      load();
    }
  };

  return (
    <>
      <Dropdown.Item as="button" type="button" onClick={open} className="d-flex align-items-center">
        <FaBell className="me-2" />
        <span className="flex-grow-1">{t('navbar.notifications')}</span>
        {unread > 0 ? <span className="badge rounded-pill bg-danger ms-2">{unread}</span> : null}
      </Dropdown.Item>
      <NotificationsModal
        show={show}
        onHide={() => setShow(false)}
        onUnreadDelta={onUnreadDelta}
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
