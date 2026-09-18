import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { resultLineOf } from '../../../components/common/bulkResult';
import ConfirmModal from '../../../components/common/ConfirmModal';
import SectionHeading from '../../../components/common/SectionHeading';
import { errorKeys } from '../../../components/common/StepUpDialog';
import SubTable from '../../../components/common/SubTable';
import { useNotify } from '../../../contexts/NoticeContext';
import { useTablePrefs } from '../../../hooks/useTablePrefs';
import { bruteForce, unblock, unblockAll, unblockBulk } from '../api/security';
import { useAdminRead } from '../hooks/useAdminRead';
import { BRUTE_FORCE } from '../utils/examples';

import AdminLoading from './AdminLoading';

const PREFS_KEY = 'table_prefs_admin_blocked';

const columns = [
  {
    key: 'ip',
    kind: 'text',
    labelKey: 'admin.blocked.table.ip',
    render: row => <code>{row.ip}</code>,
  },
  {
    key: 'attempts',
    kind: 'count',
    labelKey: 'admin.blocked.table.attempts',
    className: 'text-end',
    render: row => <span className="badge bg-danger">{row.attempts}</span>,
  },
];

const RowActions = ({ entry, onUnblock }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-primary"
      onClick={() => onUnblock(entry)}
    >
      {t('admin.blocked.unblock')}
    </button>
  );
};

RowActions.propTypes = {
  entry: PropTypes.shape({ ip: PropTypes.string.isRequired }).isRequired,
  onUnblock: PropTypes.func.isRequired,
};

const useSelection = rows => {
  const [selected, setSelected] = useState(() => new Set());
  const toggle = id =>
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  const allSelected = rows.length > 0 && rows.every(row => selected.has(row.ip));
  const someSelected = selected.size > 0;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map(row => row.ip)));
  const clear = () => setSelected(new Set());
  return {
    selected,
    toggleAll,
    allSelected,
    someSelected,
    clear,
    subtable: {
      allSelected,
      someSelected,
      onToggleAll: toggleAll,
      isSelected: row => selected.has(row.ip),
      onToggleRow: row => toggle(row.ip),
      labelOf: row => row.ip,
    },
  };
};

/**
 * The Blocked IPs page's bulk actions, drawn in the heading's action pane
 * while rows are selected: Unblock, behind the shared confirm, over
 * `POST /api/admin/brute-force/bulk`, and the result line naming
 * processed, skipped and each error's code translated (decision 149).
 */
const BulkActions = ({ selected, onDone }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const send = () => {
    setBusy(true);
    unblockBulk(selected)
      .then(answer => {
        setResult(answer);
        onDone();
      })
      .catch(error => notify('danger', t(errorKeys(error))))
      .finally(() => {
        setBusy(false);
        setPending(false);
      });
  };

  const line = resultLineOf(t, 'admin.blocked.bulk', result);

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        disabled={busy || selected.length === 0}
        onClick={() => setPending(true)}
      >
        {t('admin.blocked.unblock')}
      </button>
      {line ? (
        <span className="small text-muted" role="status">
          {line}
        </span>
      ) : null}
      <ConfirmModal
        show={pending}
        handleClose={() => setPending(false)}
        handleConfirm={send}
        title={t('admin.blocked.bulk.confirmTitle')}
        message={t('admin.blocked.bulk.confirmBody', {
          count: selected.length,
          keyword: t('pages.confirm.keyword'),
        })}
      />
    </>
  );
};

BulkActions.propTypes = {
  selected: PropTypes.array.isRequired,
  onDone: PropTypes.func.isRequired,
};

/**
 * Security › Blocked IPs: a `SectionHeading` carrying the enabled line
 * and the blocked count as muted text after the title, Unblock all
 * (`DELETE /api/admin/brute-force`) as the heading's action behind a
 * confirm, the table's select column a real checkbox header, the
 * select-all for the page, the per-row Unblock behind its own confirm,
 * and the heading's action pane gaining, while rows are picked, "N
 * selected", Clear selection and Unblock beside Unblock all; the table's
 * sort, hidden columns and column widths under `table_prefs_admin_blocked`;
 * the sidebar's badge is the shell's, from the `admin` topic's
 * `blocked-count`.
 */
const BlockedIpsPage = () => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const { data, loading, reload } = useAdminRead({ read: bruteForce, example: BRUTE_FORCE });
  const [unblocking, setUnblocking] = useState(null);
  const [unblockingAll, setUnblockingAll] = useState(false);
  const blockedRows = useMemo(() => data?.blocked || [], [data]);
  const selection = useSelection(blockedRows);
  const prefs = useTablePrefs(PREFS_KEY, columns);

  useEffect(() => {
    document.title = t('admin.blocked.title');
  }, [t]);

  const confirmUnblock = () => {
    unblock(unblocking.ip)
      .then(() => {
        notify('success', t('admin.blocked.unblocked', { ip: unblocking.ip }));
        reload();
      })
      .catch(error => notify('danger', t(error.messageKey || 'errors.request')));
  };

  const confirmUnblockAll = () => {
    unblockAll()
      .then(() => {
        notify('success', t('admin.blocked.disabled'));
        reload();
      })
      .catch(error => notify('danger', t(error.messageKey || 'errors.request')))
      .finally(() => setUnblockingAll(false));
  };

  if (loading && !data) {
    return <AdminLoading />;
  }
  if (!data) {
    return null;
  }

  const blocked = data.blocked || [];
  const enabledCount = data.enabled
    ? t('admin.blocked.enabled', { count: blocked.length })
    : t('admin.blocked.disabled');
  const unblockAllAction = (
    <button
      type="button"
      className="btn btn-sm btn-outline-danger"
      disabled={blocked.length === 0}
      onClick={() => setUnblockingAll(true)}
    >
      {t('admin.blocked.unblockAll')}
    </button>
  );
  const headingActions = selection.someSelected ? (
    <>
      <strong>{t('admin.blocked.bulk.selected', { count: selection.selected.size })}</strong>
      <button type="button" className="btn btn-sm btn-link" onClick={selection.clear}>
        {t('admin.blocked.bulk.clearSelection')}
      </button>
      <BulkActions
        selected={[...selection.selected]}
        onDone={() => {
          selection.clear();
          reload();
        }}
      />
      {unblockAllAction}
    </>
  ) : (
    unblockAllAction
  );

  return (
    <div>
      <SectionHeading
        title={t('admin.blocked.title')}
        count={enabledCount}
        actions={headingActions}
      />
      <SubTable
        columns={columns}
        rows={blocked}
        rowKey={row => row.ip}
        RowActions={RowActions}
        actionsProps={{ onUnblock: setUnblocking }}
        rowProp="entry"
        sort={prefs.sort}
        onSort={prefs.setSort}
        hiddenColumns={prefs.hiddenColumns}
        widths={prefs.widths}
        onResize={prefs.setColumnWidth}
        ctx={{ t, language: i18n.language }}
        emptyText={t('pages.empty')}
        selection={selection.subtable}
      />
      <ConfirmModal
        show={Boolean(unblocking)}
        handleClose={() => setUnblocking(null)}
        handleConfirm={confirmUnblock}
        title={t('admin.blocked.unblockTitle')}
        message={t('admin.blocked.unblockBody', { ip: unblocking?.ip || '' })}
      />
      <ConfirmModal
        show={unblockingAll}
        handleClose={() => setUnblockingAll(false)}
        handleConfirm={confirmUnblockAll}
        title={t('admin.blocked.unblockAllTitle')}
        message={t('admin.blocked.unblockAllBody', {
          count: blocked.length,
          keyword: t('pages.confirm.keyword'),
        })}
      />
    </div>
  );
};

export default BlockedIpsPage;
