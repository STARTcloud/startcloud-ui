import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaMagnifyingGlass, FaXmark } from 'react-icons/fa6';

import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { fetchPackageInfo, installPackages, uninstallPackages } from '../api/packages';
import { useManageSend, useTaskFollow } from '../hooks/useHostManage';
import { packageActionBody } from '../utils/manageCatalog';

import ManageTable from './ManageTable';
import PackageActionModal from './PackageActionModal';
import { PACKAGE_COLUMNS, PackageRowActions } from './PackageColumns';
import PackageDetailsModal from './PackageDetailsModal';
import TaskDialog from './TaskDialog';

const rowKey = row => row.name;

const RemoteSearch = ({ query, busy, onSearch }) => {
  const { t } = useTranslation();
  const [typed, setTyped] = useState(query);
  return (
    <form
      className="input-group input-group-sm mb-3"
      data-form="package-search"
      onSubmit={event => {
        event.preventDefault();
        onSearch(typed.trim());
      }}
    >
      <input
        id="package-search-query"
        className="form-control"
        type="text"
        aria-label={t('host.packageFilters.searchAvailablePackages')}
        placeholder={t('host.packageFilters.searchForPackages')}
        value={typed}
        onChange={event => setTyped(event.target.value)}
        disabled={busy}
      />
      <button
        type="submit"
        className="btn btn-info"
        data-action="package-search"
        disabled={busy || !typed.trim()}
      >
        <FaMagnifyingGlass className="me-1" aria-hidden="true" />
        {t('host.packageFilters.search')}
      </button>
      {query ? (
        <button
          type="button"
          className="btn btn-secondary"
          data-action="package-search-clear"
          onClick={() => {
            setTyped('');
            onSearch('');
          }}
          disabled={busy}
        >
          <FaXmark className="me-1" aria-hidden="true" />
          {t('host.packageFilters.clear')}
        </button>
      ) : null}
    </form>
  );
};

RemoteSearch.propTypes = {
  query: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onSearch: PropTypes.func.isRequired,
};

/**
 * The packages of a host, hyperweaver-ui's package section as the body
 * of the Manage page's Packages section: the one table over the rows
 * the page's binding left, hyperweaver-ui's remote search as a form
 * over it whose query switches the read to `GET system/packages/search`,
 * the show-all switch in the navbar's panel with the publisher and the
 * status as filter groups, and on each row Install or Uninstall, whose
 * dialog sends `POST system/packages/install` or `/uninstall` as a
 * queued task followed on `task-updated` and the packages read again at
 * its end, and View details, which reads `GET system/packages/info`
 * and opens the detail dialog. Nothing polls.
 */
const PackagesSection = ({ id, ctx, table, reading, params, setParam, filtering }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const { send, busy, task, closeTask } = useManageSend(id);
  const [dialog, setDialog] = useState(null);
  const [opening, setOpening] = useState(false);
  const follow = useTaskFollow({ id, onEnd: reading.refresh });

  const openDetails = async row => {
    setOpening(true);
    try {
      const details = await fetchPackageInfo(status, id, row.name, !row.installed);
      setDialog({ kind: 'details', pkg: { ...row, details } });
    } catch (error) {
      notify('danger', t('hosts.manage.packages.readFailed', { message: error.message }));
    } finally {
      setOpening(false);
    }
  };

  const onAction = (action, row) => {
    if (action === 'details') {
      openDetails(row);
    } else {
      setDialog({ kind: action, pkg: row });
    }
  };

  const act = async options => {
    const { kind, pkg } = dialog;
    const call = kind === 'install' ? installPackages : uninstallPackages;
    const { answer, error } = await send({
      call: () => call(status, id, packageActionBody(pkg.name, options)),
      doneKey: `hosts.manage.packages.${kind}Queued`,
      values: { name: pkg.name },
      failKey: 'hosts.manage.packages.failed',
    });
    if (!error) {
      setDialog(null);
      follow(answer);
      reading.refresh();
    }
  };

  return (
    <div data-panel="packages-body">
      <RemoteSearch
        query={params.packages.searchQuery}
        busy={busy}
        onSearch={query => setParam('packages', 'searchQuery', query)}
      />
      {params.packages.searchQuery ? (
        <p className="text-muted small" data-note="package-search">
          {t('host.packageSection.searchResults', { count: table.rows.length })}
        </p>
      ) : null}
      <ManageTable
        name="packages"
        columns={PACKAGE_COLUMNS}
        table={table}
        rowKey={rowKey}
        RowActions={PackageRowActions}
        actionsProps={{ busy: busy || opening, onAction }}
        ctx={ctx}
        emptyKey={
          params.packages.searchQuery
            ? 'host.packageTable.noPackagesFoundForSearch'
            : 'host.packageTable.noPackagesFound'
        }
        reading={reading}
        filtering={filtering}
      />
      {dialog?.kind === 'details' ? (
        <PackageDetailsModal pkg={dialog.pkg} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.kind === 'install' || dialog?.kind === 'uninstall' ? (
        <PackageActionModal
          pkg={dialog.pkg}
          action={dialog.kind}
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={act}
        />
      ) : null}
      {task ? <TaskDialog status={status} id={id} task={task.row} onHide={closeTask} /> : null}
    </div>
  );
};

PackagesSection.propTypes = {
  id: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  table: PropTypes.object.isRequired,
  reading: PropTypes.shape({
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
    refresh: PropTypes.func.isRequired,
  }).isRequired,
  params: PropTypes.shape({
    packages: PropTypes.shape({ searchQuery: PropTypes.string.isRequired }).isRequired,
  }).isRequired,
  setParam: PropTypes.func.isRequired,
  filtering: PropTypes.bool.isRequired,
};

export default PackagesSection;
