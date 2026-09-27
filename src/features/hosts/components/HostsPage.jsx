import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import EmptyState from '../../../components/common/EmptyState';
import PageHeader from '../../../components/common/PageHeader';
import SubTable from '../../../components/common/SubTable';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { pageContextShape } from '../../../utils/itemShape';
import { useServers } from '../hooks/useServers';
import { hostKey, hostLabel } from '../utils/hosts';

import RefreshButton from './RefreshButton';

const DEFAULT_SORT = [{ column: 'name', direction: 'asc' }];

const hostPath = server => `/hosts/${server.id}`;

const machinesWord = (server, ctx) =>
  ctx.t(
    server.capabilities?.features?.includes('machines')
      ? 'hosts.page.machinesYes'
      : 'hosts.page.machinesNo'
  );

const matches = (server, needle) =>
  [hostLabel(server), server.hostname || ''].some(text => text.toLowerCase().includes(needle));

/**
 * The hosts table's columns, each sorting by what its cell shows: the
 * label linking to the host's page, the hostname, the hypervisors joined,
 * the platform, the version and whether the registry row advertises
 * `machines`, every value the registry row already carries.
 */
const columns = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'hosts.page.name',
    value: hostLabel,
    render: server => (
      <Link to={hostPath(server)} className="fw-semibold">
        {hostLabel(server)}
      </Link>
    ),
  },
  {
    key: 'hostname',
    kind: 'text',
    labelKey: 'hosts.page.hostname',
    priority: 6,
    value: server => server.hostname || '',
  },
  {
    key: 'hypervisors',
    kind: 'text',
    labelKey: 'hosts.page.hypervisors',
    priority: 7,
    value: server => (server.capabilities?.hypervisors || []).join(', '),
  },
  {
    key: 'platform',
    kind: 'text',
    labelKey: 'hosts.page.platform',
    priority: 8,
    value: server => server.capabilities?.platform || '',
  },
  {
    key: 'version',
    kind: 'text',
    labelKey: 'hosts.page.version',
    priority: 9,
    value: server => server.capabilities?.version || '',
  },
  {
    key: 'machines',
    kind: 'word',
    labelKey: 'hosts.page.machines',
    priority: 5,
    value: machinesWord,
  },
];

/**
 * The hosts page at `/` of a host that advertises `hosts`: one row per
 * server of `useServers`, the registry of `GET /api/servers` on the
 * server role and the one serving agent on an agent role, drawn in the
 * one `SubTable` over Name, Hostname, Hypervisors, Platform, Version and
 * Machines, every cell from the registry row alone so the table fires no
 * request per row, narrowed by the navbar binding of `useDetailSearch`
 * under `table_prefs_hosts`, Refresh in the heading's actions reading
 * the list again; the loading line while the list has not
 * answered, the danger alert when it failed and the empty placard while
 * no agent is registered.
 */
const HostsPage = ({ context }) => {
  const { t, i18n } = useTranslation();
  const { servers, loaded, failed, refresh } = useServers();
  const ctx = { ...context, t, language: i18n.language };
  const search = useDetailSearch({
    rows: servers,
    matches,
    placeholderKey: 'hosts.page.search',
    columns,
    ctx,
    prefsKey: `${context.prefsPrefix}_hosts`,
    defaultSort: DEFAULT_SORT,
  });

  useEffect(() => {
    document.title = context.appName;
  }, [context.appName]);

  if (!loaded) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  return (
    <div className="list row">
      <PageHeader title={t('hosts.page.title')} actions={<RefreshButton onRefresh={refresh} />} />
      {failed ? (
        <div className="alert alert-danger" role="alert">
          {t('hosts.page.loadError')}
        </div>
      ) : null}
      {servers.length === 0 ? (
        <EmptyState title={t('hosts.empty.title')} body={t('hosts.empty.body')} />
      ) : (
        <SubTable
          columns={columns}
          rows={search.rows}
          rowKey={hostKey}
          sort={search.sort}
          onSort={search.setSort}
          hiddenColumns={search.hiddenColumns}
          widths={search.widths}
          onResize={search.setColumnWidth}
          ctx={ctx}
          emptyText={t(search.filtering ? 'pages.noMatches' : 'hosts.empty.title')}
        />
      )}
    </div>
  );
};

HostsPage.propTypes = {
  context: pageContextShape.isRequired,
};

export default HostsPage;
