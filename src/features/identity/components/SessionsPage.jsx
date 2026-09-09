import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';
import Pager from '../../../components/common/Pager';
import SubTable from '../../../components/common/SubTable';
import { useNotify } from '../../../contexts/NoticeContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { revokeSession, sessions } from '../api/activity';
import { useAdminRead } from '../hooks/useAdminRead';
import { SESSIONS } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';
import TableWrap from './TableWrap';

const PREFS_KEY = 'table_prefs_admin_sessions';
const PAGE_SIZE = 25;

const matches = (row, needle) =>
  [row.full_name || '', row.client_name || ''].some(text => text.toLowerCase().includes(needle));

const columns = [
  {
    key: 'user',
    labelKey: 'admin.activity.sessions.user',
    sortValue: row => (row.full_name || '').toLowerCase(),
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
    labelKey: 'admin.activity.address',
    sortValue: row => row.ip_address || '',
    render: row => <code>{row.ip_address}</code>,
  },
  {
    key: 'device',
    labelKey: 'admin.activity.device',
    sortValue: row => (row.user_agent || '').toLowerCase(),
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
    labelKey: 'admin.activity.sessions.authorized',
    sortValue: row => new Date(row.authorized_at || 0).getTime(),
    render: row => <DateCell value={row.authorized_at} />,
  },
  {
    key: 'last_accessed_at',
    labelKey: 'admin.activity.sessions.lastActive',
    sortValue: row => new Date(row.last_accessed_at || 0).getTime(),
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

/**
 * Activity › Sessions: its search bound to the navbar box over user and
 * application, the query its one narrowing since the page has no other
 * filter, with the Columns group under `table_prefs_admin_sessions`; the
 * table with Authorized and Last active as two columns, Revoke behind the
 * confirm, and the pager.
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
  const search = useDetailSearch({
    rows,
    matches,
    placeholderKey: 'admin.activity.sessions.search',
    columns,
    prefsKey: PREFS_KEY,
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

  return (
    <div>
      {loading && !data ? (
        <AdminLoading />
      ) : (
        <TableWrap>
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
            ctx={{ t, language: i18n.language }}
            emptyText={search.filtering ? t('pages.noMatches') : t('pages.empty')}
          />
        </TableWrap>
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
