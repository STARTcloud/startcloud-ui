import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowUpRightFromSquare } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import { resultLineOf } from '../../../components/common/bulkResult';
import ConfirmModal from '../../../components/common/ConfirmModal';
import {
  NotificationGlyph,
  absoluteTime,
  extractEntries,
  linkOf,
  notificationShape,
} from '../../../components/common/InboxList';
import { inAppPath } from '../../../components/common/MethodList';
import Pager from '../../../components/common/Pager';
import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import { notificationsAdapterShape } from '../../../components/layout/NotificationsModal';
import { useNotify } from '../../../contexts/NoticeContext';
import { useUnread } from '../../../contexts/UnreadContext';
import { useListSearch } from '../../../hooks/useListSearch';
import { useSelection } from '../../../hooks/useSelection';
import { formatRelativeTime } from '../../../utils/relativeTime';

const PREFS_KEY = 'table_prefs_inbox';
const NO_GROUPS = [];

const FILTER_GROUPS = [
  {
    key: 'read',
    labelKey: 'inbox.filter.status',
    values: row => [row.read_at ? 'read' : 'unread'],
    order: ['unread', 'read'],
    activeClass: 'bg-primary',
    labelFor: (value, t) => t(`inbox.filter.${value}`),
  },
  {
    key: 'type',
    labelKey: 'inbox.filter.type',
    values: row => (row.type ? [row.type] : []),
    activeClass: 'bg-secondary',
    labelFor: (value, t) => t(`inbox.type.${value}`, { defaultValue: value }),
  },
];

const matches = (entry, needle) =>
  [entry.title, entry.body].some(text =>
    String(text || '')
      .toLowerCase()
      .includes(needle)
  );

const totalPagesOf = data => Math.max(0, Number(data?.total_pages) || 0);

const totalOf = data => Math.max(0, Number(data?.total) || 0);

const readNow = () => new Date().toISOString();

const keepServerFilters = () => undefined;

const runBulk = async (rows, call) => {
  const settled = await Promise.allSettled(rows.map(row => call(row)));
  const succeeded = [];
  const errors = [];
  settled.forEach((outcome, index) => {
    if (outcome.status === 'fulfilled') {
      succeeded.push(rows[index]);
    } else {
      errors.push({ code: outcome.reason?.code || 'error' });
    }
  });
  return { succeeded, processed: succeeded.length, skipped: errors.length, errors };
};

const TitleCell = ({ entry, onSelect }) => {
  const unread = !entry.read_at;
  const weight = unread ? ' fw-semibold' : '';
  return (
    <span className="d-inline-flex align-items-start gap-2">
      <NotificationGlyph entry={entry} />
      {linkOf(entry) ? (
        <button
          type="button"
          className={`btn btn-link p-0 text-start${weight}`}
          onClick={() => onSelect(entry)}
        >
          {entry.title}
          <FaArrowUpRightFromSquare className="ms-1 small text-body-secondary" aria-hidden />
        </button>
      ) : (
        <span className={weight.trim()}>{entry.title}</span>
      )}
      {unread ? <span className="notification-item-dot flex-shrink-0" /> : null}
    </span>
  );
};

TitleCell.propTypes = {
  entry: notificationShape.isRequired,
  onSelect: PropTypes.func.isRequired,
};

const typeWord = (row, ctx) =>
  row.type ? ctx.t(`inbox.type.${row.type}`, { defaultValue: row.type }) : '';

const columns = [
  {
    key: 'title',
    kind: 'name',
    labelKey: 'inbox.columns.title',
    value: row => row.title || '',
    render: (row, ctx) => <TitleCell entry={row} onSelect={ctx.onSelect} />,
  },
  {
    key: 'body',
    kind: 'text',
    labelKey: 'inbox.columns.body',
    value: row => row.body || '',
  },
  {
    key: 'time',
    kind: 'relative',
    labelKey: 'inbox.columns.time',
    value: row => new Date(row.created_at || 0).getTime(),
    render: (row, ctx) => (
      <span title={absoluteTime(row.created_at, ctx.language)}>
        {formatRelativeTime(row.created_at, ctx.language)}
      </span>
    ),
  },
  {
    key: 'type',
    kind: 'badge',
    labelKey: 'inbox.columns.type',
    defaultHidden: true,
    value: typeWord,
    render: (row, ctx) =>
      row.type ? <span className="badge bg-secondary">{typeWord(row, ctx)}</span> : '',
  },
];

const RowActions = ({ entry, onMarkRead, onSelect, onDismiss }) => {
  const { t } = useTranslation();
  return (
    <>
      {entry.read_at ? null : (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onMarkRead(entry)}
        >
          {t('inbox.markRead')}
        </button>
      )}
      {linkOf(entry) ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onSelect(entry)}
        >
          {t('inbox.viewDetails')}
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        onClick={() => onDismiss(entry)}
      >
        {t('inbox.delete')}
      </button>
    </>
  );
};

RowActions.propTypes = {
  entry: notificationShape.isRequired,
  onMarkRead: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

/**
 * The inbox page's bulk actions over the picked rows: Mark as read and
 * Mark as unread at once, Delete behind the shared confirm, each one
 * existing per-row call per picked row counted into a result line, the
 * unread count adjusted by the rows whose state actually changed.
 *
 * @param {Object} options
 * @param {Object} options.notifications - The notifications adapter
 * @param {Array} options.picked - The picked rows
 * @param {Function} options.adjustUnread - The unread context's adjust
 * @param {Function} options.setEntries - The page's rows setter
 * @param {Function} options.clearSelection - Empties the selection
 * @param {Function} options.load - Re-reads the page
 * @returns {{ bulkResult: Object|null, showBulkDelete: boolean, setShowBulkDelete: Function, bulkMarkRead: Function, bulkMarkUnread: Function, bulkDelete: Function }} The bulk state
 */
const useBulkActions = ({
  notifications,
  picked,
  adjustUnread,
  setEntries,
  clearSelection,
  load,
}) => {
  const [bulkResult, setBulkResult] = useState(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const bulkMarkRead = async () => {
    setBulkResult(null);
    const { succeeded, processed, skipped, errors } = await runBulk(picked, entry =>
      notifications.markRead(entry.id)
    );
    const newlyRead = succeeded.filter(entry => !entry.read_at);
    if (newlyRead.length > 0) {
      adjustUnread(-newlyRead.length);
      const ids = new Set(newlyRead.map(entry => entry.id));
      setEntries(previous =>
        previous.map(item => (ids.has(item.id) ? { ...item, read_at: readNow() } : item))
      );
    }
    setBulkResult({ processed, skipped, errors });
    clearSelection();
  };

  const bulkMarkUnread = async () => {
    setBulkResult(null);
    const { succeeded, processed, skipped, errors } = await runBulk(picked, entry =>
      notifications.markUnread(entry.id)
    );
    const newlyUnread = succeeded.filter(entry => entry.read_at);
    if (newlyUnread.length > 0) {
      adjustUnread(newlyUnread.length);
      const ids = new Set(newlyUnread.map(entry => entry.id));
      setEntries(previous =>
        previous.map(item => (ids.has(item.id) ? { ...item, read_at: null } : item))
      );
    }
    setBulkResult({ processed, skipped, errors });
    clearSelection();
  };

  const bulkDelete = async () => {
    setBulkResult(null);
    const { succeeded, processed, skipped, errors } = await runBulk(picked, entry =>
      notifications.remove(entry.id)
    );
    const unreadDeleted = succeeded.filter(entry => !entry.read_at).length;
    if (unreadDeleted > 0) {
      adjustUnread(-unreadDeleted);
    }
    setBulkResult({ processed, skipped, errors });
    clearSelection();
    setShowBulkDelete(false);
    await load();
  };

  return {
    bulkResult,
    showBulkDelete,
    setShowBulkDelete,
    bulkMarkRead,
    bulkMarkUnread,
    bulkDelete,
  };
};

const BulkPane = ({ count, onClear, onMarkRead, onMarkUnread, onDelete }) => {
  const { t } = useTranslation();
  if (count === 0) {
    return null;
  }
  return (
    <>
      <strong>{t('inbox.bulk.selected', { count })}</strong>
      <button type="button" className="btn btn-sm btn-link" onClick={onClear}>
        {t('inbox.bulk.clearSelection')}
      </button>
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onMarkRead}>
        {t('inbox.bulk.markRead')}
      </button>
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onMarkUnread}>
        {t('inbox.bulk.markUnread')}
      </button>
      <button type="button" className="btn btn-sm btn-outline-danger" onClick={onDelete}>
        {t('inbox.bulk.delete')}
      </button>
    </>
  );
};

BulkPane.propTypes = {
  count: PropTypes.number.isRequired,
  onClear: PropTypes.func.isRequired,
  onMarkRead: PropTypes.func.isRequired,
  onMarkUnread: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

/**
 * The full inbox at `/notifications`, the one table of the estate over
 * the hub's paged shape: the navbar search bound with a query over the
 * loaded rows by title and body, the Status (`unread`, `read`) and Type
 * groups narrowing the loaded rows client-side, the Per page group (25,
 * 50, 100, 250) resetting the page to 0 on a change and the Columns
 * group, the sort, the hidden columns, the widths and the size under
 * `table_prefs_inbox`; a `SectionHeading` carrying the total as muted
 * text after the title, its action pane reading, while rows are picked,
 * "N selected", Clear selection, Mark as read, Mark as unread and Delete,
 * then always Mark all as read and Delete all (`DELETE
 * /api/notifications`, behind a confirm), each bulk action one existing
 * per-row call per picked row (Mark as unread `POST
 * /api/notifications/{id}/unread`, decision 151) counted into a result
 * line under the heading naming processed, skipped and each error's
 * code, clearing on the next bulk action; the table's select column a
 * real checkbox header, the select-all for the page, indeterminate when
 * some but not all rows are picked, the Title column the type icon
 * colored by severity, the title bold while unread and a link with the
 * open-in glyph while the row's `navigate` is an `https:` URL or a
 * same-origin path, and the unread dot, the Body column, the Time column
 * the relative time with the absolute time in its tooltip, the Type
 * column a badge hidden by default; the row actions Mark as read while
 * unread, View details while the row carries a followable link, and
 * Delete; the pager as the section's foot; every change to the unread
 * count goes through the notifications feature's one context (identity
 * contract decision 142).
 */
const InboxPage = ({ notifications }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const navigate = useNavigate();
  const { adjust: adjustUnread } = useUnread();
  const [page, setPage] = useState(0);
  const [entries, setEntries] = useState([]);
  const [query, setQuery] = useState('');
  const [paging, setPaging] = useState({ totalPages: 0, total: 0 });
  const [loadFailed, setLoadFailed] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const selection = useSelection(entries, { labelOf: row => row.title });

  const needle = query.trim().toLowerCase();
  const searched = useMemo(
    () => (needle ? entries.filter(entry => matches(entry, needle)) : entries),
    [entries, needle]
  );
  const search = useListSearch({
    query,
    onQueryChange: setQuery,
    placeholderKey: 'inbox.search',
    groups: NO_GROUPS,
    clientGroups: FILTER_GROUPS,
    onClearFilters: keepServerFilters,
    action: null,
    rows: searched,
    columns,
    ctx: { t, language: i18n.language },
    prefsKey: PREFS_KEY,
  });

  const [pagedForSize, setPagedForSize] = useState(search.size);
  if (pagedForSize !== search.size) {
    setPagedForSize(search.size);
    setPage(0);
  }

  useEffect(() => {
    document.title = t('inbox.title');
  }, [t]);

  const load = useCallback(
    () =>
      notifications
        .list({ page, size: search.size })
        .then(data => {
          setLoadFailed(false);
          setEntries(extractEntries(data));
          setPaging({ totalPages: totalPagesOf(data), total: totalOf(data) });
        })
        .catch(() => setLoadFailed(true)),
    [notifications, page, search.size]
  );

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async entry => {
    if (entry.read_at) {
      return;
    }
    try {
      await notifications.markRead(entry.id);
      adjustUnread(-1);
      setEntries(previous =>
        previous.map(item => (item.id === entry.id ? { ...item, read_at: readNow() } : item))
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
    const path = inAppPath(link);
    if (path) {
      navigate(path);
    } else {
      window.location.assign(link);
    }
  };

  const dismiss = async entry => {
    try {
      await notifications.remove(entry.id);
      if (!entry.read_at) {
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
        previous.map(item => (item.read_at ? item : { ...item, read_at: readNow() }))
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

  const bulk = useBulkActions({
    notifications,
    picked,
    adjustUnread,
    setEntries,
    clearSelection: selection.clear,
    load,
  });

  const resultLine = resultLineOf(t, 'inbox.bulk', bulk.bulkResult);

  const headingActions = (
    <>
      <BulkPane
        count={picked.length}
        onClear={selection.clear}
        onMarkRead={bulk.bulkMarkRead}
        onMarkUnread={bulk.bulkMarkUnread}
        onDelete={() => bulk.setShowBulkDelete(true)}
      />
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
    </>
  );

  return (
    <div className="page-column">
      <SectionHeading title={t('inbox.title')} count={paging.total} actions={headingActions} />
      {resultLine ? (
        <p className="small text-muted" role="status">
          {resultLine}
        </p>
      ) : null}
      {loadFailed ? <p className="small text-danger">{t('inbox.loadError')}</p> : null}
      <SubTable
        columns={columns}
        rows={search.rows}
        rowKey={row => row.id}
        RowActions={RowActions}
        actionsProps={{ onMarkRead: markRead, onSelect: select, onDismiss: dismiss }}
        rowProp="entry"
        sort={search.sort}
        onSort={search.setSort}
        hiddenColumns={search.hiddenColumns}
        widths={search.widths}
        onResize={search.setColumnWidth}
        ctx={{ t, language: i18n.language, onSelect: select }}
        emptyText={entries.length > 0 ? t('pages.noMatches') : t('inbox.empty')}
        selection={selection.subtable}
      />
      <Pager
        page={page}
        totalPages={paging.totalPages}
        size={search.size}
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
        show={bulk.showBulkDelete}
        handleClose={() => bulk.setShowBulkDelete(false)}
        handleConfirm={bulk.bulkDelete}
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
