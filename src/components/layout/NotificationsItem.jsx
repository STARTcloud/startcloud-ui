import PropTypes from 'prop-types';
import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBell } from 'react-icons/fa6';

import { useUnread } from '../../contexts/UnreadContext';

import NotificationsModal, {
  notificationsAdapterShape,
  pushAdapterShape,
} from './NotificationsModal';

/**
 * The user menu's Notifications row: the bell with the unread badge from
 * the notifications feature's one context, which the shell reads and
 * keeps from boot; where the stream does not carry the `notifications`
 * topic the row reads the count again when the person opens the modal
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
  const { unread, live, adjust, read } = useUnread();
  const [show, setShow] = useState(false);

  const open = () => {
    setShow(true);
    if (!live) {
      read();
    }
  };

  const onUnreadDelta = delta => {
    adjust(delta);
    if (!live) {
      read();
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
