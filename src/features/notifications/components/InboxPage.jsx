import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import ConfirmModal from '../../../components/common/ConfirmModal';
import Pager from '../../../components/common/Pager';
import { notificationsAdapterShape } from '../../../components/layout/NotificationsModal';
import { useNotify } from '../../../contexts/NoticeContext';
import { useUnread } from '../context/UnreadContext';

import InboxList, { extractEntries, linkOf } from './InboxList';

const PAGE_SIZE = 25;

const totalPagesOf = data => Math.max(0, Number(data?.total_pages) || 0);

const totalOf = data => Math.max(0, Number(data?.total) || 0);

const readNow = () => new Date().toISOString();

/**
 * The full inbox at `/notifications`: the modal's rows in a full-width
 * list, twenty-five per page with the pager over the hub's paged shape,
 * Mark all as read and Delete all (`DELETE /api/notifications`) behind a
 * confirm at the top, the per-row Mark as read and Delete, and View
 * details following a row's `navigate` when it is an `https:` URL or a
 * same-origin path; every change to the unread count goes through the
 * notifications feature's one context.
 */
const InboxPage = ({ notifications }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const navigate = useNavigate();
  const { adjust: adjustUnread } = useUnread();
  const [page, setPage] = useState(0);
  const [entries, setEntries] = useState([]);
  const [paging, setPaging] = useState({ totalPages: 0, total: 0 });
  const [loadFailed, setLoadFailed] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const labels = {
    markRead: t('inbox.markRead'),
    dismiss: t('inbox.delete'),
    viewDetails: t('inbox.viewDetails'),
  };

  useEffect(() => {
    document.title = t('inbox.title');
  }, [t]);

  const load = useCallback(
    () =>
      notifications
        .list({ page, size: PAGE_SIZE })
        .then(data => {
          setLoadFailed(false);
          setEntries(extractEntries(data));
          setPaging({ totalPages: totalPagesOf(data), total: totalOf(data) });
        })
        .catch(() => setLoadFailed(true)),
    [notifications, page]
  );

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async entry => {
    if (entry.readAt) {
      return;
    }
    try {
      await notifications.markRead(entry.id);
      adjustUnread(-1);
      setEntries(previous =>
        previous.map(item => (item.id === entry.id ? { ...item, readAt: readNow() } : item))
      );
    } catch {
      notify('danger', t('inbox.markReadError'));
    }
  };

  const select = async entry => {
    await markRead(entry);
    const link = linkOf(entry);
    if (!link) {
      return;
    }
    if (link.startsWith('/')) {
      navigate(link);
    } else {
      window.location.assign(link);
    }
  };

  const dismiss = async entry => {
    try {
      await notifications.remove(entry.id);
      if (!entry.readAt) {
        adjustUnread(-1);
      }
      await load();
    } catch {
      notify('danger', t('inbox.dismissError'));
    }
  };

  const markAll = async () => {
    try {
      await notifications.markAllRead();
      adjustUnread(-Infinity);
      setEntries(previous =>
        previous.map(item => (item.readAt ? item : { ...item, readAt: readNow() }))
      );
    } catch {
      notify('danger', t('inbox.markAllReadError'));
    }
  };

  const deleteAll = async () => {
    try {
      await notifications.removeAll();
      adjustUnread(-Infinity);
      setPage(0);
      await load();
    } catch {
      notify('danger', t('inbox.dismissError'));
    }
  };

  return (
    <div className="list">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <h3 className="mb-0">{t('inbox.title')}</h3>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={markAll}
            disabled={entries.length === 0}
          >
            {t('inbox.markAll')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => setShowDeleteAll(true)}
            disabled={entries.length === 0}
          >
            {t('inbox.deleteAll')}
          </button>
        </div>
      </div>
      <div className="card">
        {loadFailed ? <p className="small text-danger m-3">{t('inbox.loadError')}</p> : null}
        {!loadFailed && entries.length === 0 ? (
          <p className="small text-body-secondary m-3">{t('inbox.empty')}</p>
        ) : null}
        <InboxList
          entries={entries}
          onSelect={select}
          onMarkRead={markRead}
          onDismiss={dismiss}
          labels={labels}
        />
      </div>
      <Pager
        page={page}
        totalPages={paging.totalPages}
        size={PAGE_SIZE}
        total={paging.total}
        onChange={setPage}
      />
      <ConfirmModal
        show={showDeleteAll}
        handleClose={() => setShowDeleteAll(false)}
        handleConfirm={deleteAll}
        title={t('inbox.deleteAll')}
        message={t('inbox.deleteAllBody', { keyword: t('pages.confirm.keyword') })}
      />
    </div>
  );
};

InboxPage.propTypes = {
  notifications: notificationsAdapterShape.isRequired,
};

export default InboxPage;
