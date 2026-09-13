import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';
import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import { useNotify } from '../../../contexts/NoticeContext';
import { bruteForce, unblock, unblockAll } from '../api/security';
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
 * Security › Blocked IPs: a `SectionHeading` carrying the enabled line
 * and the blocked count as muted text after the title, Unblock all
 * (`DELETE /api/admin/brute-force`) as the heading's action behind a
 * confirm, the table, and the per-row Unblock behind its own confirm;
 * the sidebar's badge is the shell's, from the `admin` topic's
 * `blocked-count`.
 */
const BlockedIpsPage = () => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const { data, loading, reload } = useAdminRead({ read: bruteForce, example: BRUTE_FORCE });
  const [unblocking, setUnblocking] = useState(null);
  const [unblockingAll, setUnblockingAll] = useState(false);

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

  return (
    <div>
      <SectionHeading
        title={t('admin.blocked.title')}
        count={enabledCount}
        actions={unblockAllAction}
      />
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
