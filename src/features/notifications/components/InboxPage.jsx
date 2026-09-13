import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import ConfirmModal from '../../../components/common/ConfirmModal';
import InboxList, { extractEntries, linkOf } from '../../../components/common/InboxList';
import Pager from '../../../components/common/Pager';
import SectionHeading from '../../../components/common/SectionHeading';
import { notificationsAdapterShape } from '../../../components/layout/NotificationsModal';
import { useNotify } from '../../../contexts/NoticeContext';
import { useUnread } from '../../../contexts/UnreadContext';
import { useNavbarSearchBinding } from '../../../hooks/useSearchBinding';

const PAGE_SIZE = 25;

const matches = (entry, needle) =>
  [entry.title, entry.body].some(text =>
    String(text || '')
      .toLowerCase()
      .includes(needle)
  );

const totalPagesOf = data => Math.max(0, Number(data?.total_pages) || 0);

const totalOf = data => Math.max(0, Number(data?.total) || 0);

const readNow = () => new Date().toISOString();

const useSelection = rows => {
  const [selected, setSelected] = useState(() => new Set());
  const toggle = entry =>
    setSelected(current => {
      const next = new Set(current);
      if (next.has(entry.id)) {
        next.delete(entry.id);
      } else {
        next.add(entry.id);
      }
      return next;
    });
  const allSelected = rows.length > 0 && rows.every(row => selected.has(row.id));
  const indeterminate = selected.size > 0 && !allSelected;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map(row => row.id)));
  const clear = () => setSelected(new Set());
  return { selected, toggle, toggleAll, allSelected, indeterminate, clear };
};

/**
 * The full inbox at `/notifications`: the modal's rows in a full-width
 * list, twenty-five per page with the pager over the hub's paged shape, a
 * `SectionHeading` whose title carries the count as muted text and whose
 * action pane reads, while rows are picked, "N selected", Clear
 * selection, Mark as read and Delete, then Mark all as read and Delete
 * all (`DELETE /api/notifications`, behind a confirm); a select column
 * whose header cell is a real checkbox, the select-all for the page,
 * indeterminate when some but not all rows are picked, at the list's
 * head, the row checkboxes its cells; the per-row Mark as read and
 * Delete, and View details following a row's `navigate` when it is an
 * `https:` URL or a same-origin path; every change to the unread count
 * goes through the notifications feature's one context; the navbar
 * search is bound with a query over the loaded rows by title and body
 * (identity contract decision 142).
 */
const InboxPage = ({ notifications }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const navigate = useNavigate();
  const { adjust: adjustUnread } = useUnread();
  const [page, setPage] = useState(0);
  const [entries, setEntries] = useState([]);
  const [query, setQuery] = useState('');
  const [paging, setPaging] = useState({ totalPages: 0, total: 0 });
  const [loadFailed, setLoadFailed] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const selection = useSelection(entries);
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
    } catch (error) {
      notify('danger', t(error.messageKey || 'errors.request'));
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
    } catch (error) {
      notify('danger', t(error.messageKey || 'errors.request'));
    }
  };

  const markAll = async () => {
    try {
      await notifications.markAllRead();
      adjustUnread(-Infinity);
      setEntries(previous =>
        previous.map(item => (item.readAt ? item : { ...item, readAt: readNow() }))
      );
    } catch (error) {
      notify('danger', t(error.messageKey || 'errors.request'));
    }
  };

  const deleteAll = async () => {
    try {
      await notifications.removeAll();
      adjustUnread(-Infinity);
      setPage(0);
      await load();
    } catch (error) {
      notify('danger', t(error.messageKey || 'errors.request'));
    }
  };

  const picked = useMemo(
    () => entries.filter(entry => selection.selected.has(entry.id)),
    [entries, selection.selected]
  );

  const bulkMarkRead = async () => {
    const unread = picked.filter(entry => !entry.readAt);
    if (unread.length === 0) {
      selection.clear();
      return;
    }
    try {
      await Promise.all(unread.map(entry => notifications.markRead(entry.id)));
      adjustUnread(-unread.length);
      const ids = new Set(unread.map(entry => entry.id));
      setEntries(previous =>
        previous.map(item => (ids.has(item.id) ? { ...item, readAt: readNow() } : item))
      );
      selection.clear();
    } catch (error) {
      notify('danger', t(error.messageKey || 'errors.request'));
    }
  };

  const bulkDelete = async () => {
    const unreadCount = picked.filter(entry => !entry.readAt).length;
    try {
      await Promise.all(picked.map(entry => notifications.remove(entry.id)));
      if (unreadCount > 0) {
        adjustUnread(-unreadCount);
      }
      selection.clear();
      await load();
    } catch (error) {
      notify('danger', t(error.messageKey || 'errors.request'));
    } finally {
      setShowBulkDelete(false);
    }
  };

  const needle = query.trim().toLowerCase();
  const shown = needle ? entries.filter(entry => matches(entry, needle)) : entries;

  useNavbarSearchBinding({
    query,
    onQueryChange: setQuery,
    placeholder: t('inbox.search'),
    matched: shown.length,
    total: entries.length,
    groups: [],
    onClearFilters: () => setQuery(''),
  });

  const headingActions = (
    <div className="d-flex align-items-center flex-wrap gap-2">
      {picked.length > 0 ? (
        <>
          <strong>{t('inbox.bulk.selected', { count: picked.length })}</strong>
          <button type="button" className="btn btn-sm btn-link" onClick={selection.clear}>
            {t('inbox.bulk.clearSelection')}
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={bulkMarkRead}>
            {t('inbox.bulk.markRead')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => setShowBulkDelete(true)}
          >
            {t('inbox.bulk.delete')}
          </button>
        </>
      ) : null}
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
  );

  return (
    <div className="list">
      <SectionHeading title={t('inbox.title')} count={paging.total} actions={headingActions} />
      <div className="border rounded">
        {loadFailed ? <p className="small text-danger m-3">{t('inbox.loadError')}</p> : null}
        {!loadFailed && shown.length === 0 ? (
          <p className="small text-body-secondary m-3">
            {needle ? t('pages.noMatches') : t('inbox.empty')}
          </p>
        ) : null}
        <InboxList
          entries={shown}
          onSelect={select}
          onMarkRead={markRead}
          onDismiss={dismiss}
          labels={labels}
          selectable
          selected={selection.selected}
          onToggleSelect={selection.toggle}
          allSelected={selection.allSelected}
          indeterminate={selection.indeterminate}
          onToggleSelectAll={selection.toggleAll}
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
      <ConfirmModal
        show={showBulkDelete}
        handleClose={() => setShowBulkDelete(false)}
        handleConfirm={bulkDelete}
        title={t('inbox.bulk.delete')}
        message={t('inbox.bulk.deleteBody', { keyword: t('pages.confirm.keyword') })}
      />
    </div>
  );
};

InboxPage.propTypes = {
  notifications: notificationsAdapterShape.isRequired,
};

export default InboxPage;
