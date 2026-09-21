import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { resultLineOf } from '../../../components/common/bulkResult';
import ConfirmModal from '../../../components/common/ConfirmModal';
import Pager from '../../../components/common/Pager';
import SectionHeading from '../../../components/common/SectionHeading';
import { errorKeys } from '../../../components/common/StepUpDialog';
import SubTable from '../../../components/common/SubTable';
import { useGuard } from '../../../contexts/GuardContext';
import { useNotify } from '../../../contexts/NoticeContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useUrlNarrowing } from '../../../hooks/useUrlNarrowing';
import { revokeSession, sessions, sessionsBulk } from '../api/activity';
import { useAdminRead } from '../hooks/useAdminRead';
import { SESSIONS } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';

const PREFS_KEY = 'table_prefs_admin_sessions';
const PAGE_SIZE = 25;

const matches = (row, needle) =>
  [row.full_name || '', row.client_name || ''].some(text => text.toLowerCase().includes(needle));

const FILTER_GROUPS = [
  {
    key: 'client',
    labelKey: 'admin.activity.sessions.client',
    values: row => (row.client_name ? [row.client_name] : []),
    activeClass: 'bg-primary',
    labelFor: value => value,
  },
];
const FILTER_KEYS = FILTER_GROUPS.map(group => group.key);

const timeOf = value => new Date(value || 0).getTime();

const columns = [
  {
    key: 'user',
    kind: 'name',
    labelKey: 'admin.activity.sessions.user',
    value: row => row.full_name || '',
    render: row => (
      <span>
        <strong>{row.full_name}</strong>
        <br />
        <span className="text-muted small">{row.client_name}</span>
      </span>
    ),
  },
  {
    key: 'ip_address',
    kind: 'text',
    labelKey: 'admin.activity.address',
    value: row => row.ip_address || '',
    render: row => <code>{row.ip_address}</code>,
  },
  {
    key: 'device',
    kind: 'text',
    labelKey: 'admin.activity.device',
    value: row => row.user_agent || '',
    render: row => (
      <span>
        {row.user_agent}
        <br />
        <span className="text-muted small">{row.location}</span>
      </span>
    ),
  },
  {
    key: 'authorized_at',
    kind: 'date',
    labelKey: 'admin.activity.sessions.authorized',
    value: row => timeOf(row.authorized_at),
    render: row => <DateCell value={row.authorized_at} />,
  },
  {
    key: 'last_accessed_at',
    kind: 'date',
    labelKey: 'admin.activity.sessions.lastActive',
    value: row => timeOf(row.last_accessed_at),
    render: row => <DateCell value={row.last_accessed_at} />,
  },
];

const RowActions = ({ session, onRevoke }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-danger"
      onClick={() => onRevoke(session)}
    >
      {t('admin.activity.sessions.revoke')}
    </button>
  );
};

RowActions.propTypes = {
  session: PropTypes.shape({ id: PropTypes.string.isRequired }).isRequired,
  onRevoke: PropTypes.func.isRequired,
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
  const allSelected = rows.length > 0 && rows.every(row => selected.has(row.id));
  const someSelected = selected.size > 0;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map(row => row.id)));
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
      isSelected: row => selected.has(row.id),
      onToggleRow: row => toggle(row.id),
      labelOf: row => row.full_name,
    },
  };
};

/**
 * The Sessions page's bulk actions, drawn in the heading's action pane
 * while rows are selected: Revoke, behind the shared confirm and the
 * step-up dialog, over `POST /api/admin/sessions/bulk`, and the result
 * line naming processed, skipped and each error's code translated
 * (decision 148).
 */
const BulkActions = ({ selected, onDone }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const guard = useGuard();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const send = () => {
    setBusy(true);
    guard(
      () => sessionsBulk({ action: 'revoke', session_ids: selected }),
      t('admin.activity.sessions.bulk.stepUpReason')
    )
      .then(answer => {
        setResult(answer);
        onDone();
      })
      .catch(error => {
        if (error?.code !== 'step_up_required') {
          notify('danger', t(errorKeys(error)));
        }
      })
      .finally(() => {
        setBusy(false);
        setPending(false);
      });
  };

  const line = resultLineOf(t, 'admin.activity.sessions.bulk', result);

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        disabled={busy || selected.length === 0}
        onClick={() => setPending(true)}
      >
        {t('admin.activity.sessions.revoke')}
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
        title={t('admin.activity.sessions.revokeTitle')}
        message={t('admin.activity.sessions.bulk.confirmBody', {
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
 * Activity › Sessions: its search bound to the navbar box over user and
 * application, the query mirrored in the URL as `search` through
 * `useUrlNarrowing`, the Client `toggle` group over the loaded rows'
 * application names narrowing them client-side, since the list names no
 * parameter for it, its values in the URL as `client`, comma-joined,
 * with the Columns group under
 * `table_prefs_admin_sessions`; a `SectionHeading` carrying the total as
 * muted text after the title, the table's select column a real checkbox
 * header, the select-all for the page, checked, unchecked or
 * indeterminate, with Authorized and Last active as two columns, Revoke
 * behind the confirm, the heading's action pane gaining, while rows are
 * picked, "N selected", Clear selection and Revoke behind the step-up
 * dialog too, and the pager.
 */
const SessionsPage = () => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const [page, setPage] = useState(0);
  const params = useMemo(() => ({ page, size: PAGE_SIZE }), [page]);
  const { data, loading, reload } = useAdminRead({
    read: () => sessions(params),
    example: SESSIONS,
    key: JSON.stringify(params),
  });
  const [revoking, setRevoking] = useState(null);
  const rows = useMemo(() => data?.items || [], [data]);
  const selection = useSelection(rows);
  const url = useUrlNarrowing({ queryKey: 'search', filterKeys: FILTER_KEYS });
  const ctx = { t, language: i18n.language };
  const search = useDetailSearch({
    rows,
    matches,
    placeholderKey: 'admin.activity.sessions.search',
    columns,
    ctx,
    prefsKey: PREFS_KEY,
    filterGroups: FILTER_GROUPS,
    url,
    bound: {
      query: url.query,
      onQueryChange: url.setQuery,
      placeholder: t('admin.activity.sessions.search'),
    },
  });

  useEffect(() => {
    document.title = t('admin.activity.sessions.title');
  }, [t]);

  const confirmRevoke = () => {
    revokeSession(revoking.id)
      .then(() => {
        notify('success', t('admin.activity.sessions.revoked'));
        reload();
      })
      .catch(error => notify('danger', t(error.messageKey || 'errors.request')));
  };

  const headingActions = selection.someSelected ? (
    <>
      <strong>
        {t('admin.activity.sessions.bulk.selected', { count: selection.selected.size })}
      </strong>
      <button type="button" className="btn btn-sm btn-link" onClick={selection.clear}>
        {t('admin.activity.sessions.bulk.clearSelection')}
      </button>
      <BulkActions
        selected={[...selection.selected]}
        onDone={() => {
          selection.clear();
          reload();
        }}
      />
    </>
  ) : null;

  return (
    <div className="page-column">
      <SectionHeading
        title={t('admin.activity.sessions.title')}
        count={data ? data.total || 0 : null}
        actions={headingActions}
      />
      {loading && !data ? (
        <AdminLoading />
      ) : (
        <SubTable
          columns={columns}
          rows={search.rows}
          rowKey={row => row.id}
          RowActions={RowActions}
          actionsProps={{ onRevoke: setRevoking }}
          rowProp="session"
          sort={search.sort}
          onSort={search.setSort}
          hiddenColumns={search.hiddenColumns}
          widths={search.widths}
          onResize={search.setColumnWidth}
          ctx={ctx}
          emptyText={search.filtering ? t('pages.noMatches') : t('pages.empty')}
          selection={selection.subtable}
        />
      )}
      {data ? (
        <Pager
          page={data.page || 0}
          totalPages={data.total_pages || 0}
          total={data.total || 0}
          size={data.size || PAGE_SIZE}
          onChange={setPage}
        />
      ) : null}
      <ConfirmModal
        show={Boolean(revoking)}
        handleClose={() => setRevoking(null)}
        handleConfirm={confirmRevoke}
        title={t('admin.activity.sessions.revokeTitle')}
        message={t('admin.activity.sessions.revokeBody', {
          user: revoking?.full_name || '',
          app: revoking?.client_name || '',
        })}
      />
    </div>
  );
};

export default SessionsPage;
