import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';
import SubTable from '../../../components/common/SubTable';
import { useNotify } from '../../../contexts/NoticeContext';
import { bruteForce, unblock } from '../api/security';
import { useAdminRead } from '../hooks/useAdminRead';
import { BRUTE_FORCE } from '../utils/examples';

import AdminLoading from './AdminLoading';
import TableWrap from './TableWrap';

const NO_SORT = [];
const NO_HIDDEN = new Set();
const noSort = () => undefined;

const columns = [
  {
    key: 'ip',
    labelKey: 'admin.blocked.table.ip',
    render: row => <code>{row.ip}</code>,
  },
  {
    key: 'attempts',
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

/**
 * Security › Blocked IPs: the enabled line with the count, painted as a
 * warning while protection is disabled, the table, and Unblock behind
 * the confirm; the sidebar's badge is the shell's, from the `admin`
 * topic's `blocked-count`.
 */
const BlockedIpsPage = () => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const { data, loading, reload } = useAdminRead({ read: bruteForce, example: BRUTE_FORCE });
  const [unblocking, setUnblocking] = useState(null);

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

  if (loading && !data) {
    return <AdminLoading />;
  }
  if (!data) {
    return null;
  }

  const blocked = data.blocked || [];

  return (
    <div>
      <div className={`alert ${data.enabled ? 'alert-info' : 'alert-warning'}`} role="status">
        {data.enabled
          ? t('admin.blocked.enabled', { count: blocked.length })
          : t('admin.blocked.disabled')}
      </div>
      <TableWrap>
        <SubTable
          columns={columns}
          rows={blocked}
          rowKey={row => row.ip}
          RowActions={RowActions}
          actionsProps={{ onUnblock: setUnblocking }}
          rowProp="entry"
          sort={NO_SORT}
          onSort={noSort}
          hiddenColumns={NO_HIDDEN}
          ctx={{ t, language: i18n.language }}
          emptyText={t('pages.empty')}
        />
      </TableWrap>
      <ConfirmModal
        show={Boolean(unblocking)}
        handleClose={() => setUnblocking(null)}
        handleConfirm={confirmUnblock}
        title={t('admin.blocked.unblockTitle')}
        message={t('admin.blocked.unblockBody', { ip: unblocking?.ip || '' })}
      />
    </div>
  );
};

export default BlockedIpsPage;
