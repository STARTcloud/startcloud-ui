import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaXmark } from 'react-icons/fa6';
import { Link, Navigate, useSearchParams } from 'react-router-dom';

import EmptyState from '../../../components/common/EmptyState';
import PageHeader from '../../../components/common/PageHeader';
import SubTable from '../../../components/common/SubTable';
import { useNotify } from '../../../contexts/NoticeContext';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useFolds } from '../../../hooks/useFolds';
import { pageContextShape } from '../../../utils/itemShape';
import { useServers } from '../hooks/useServers';
import { hostKey, hostLabel } from '../utils/hosts';
import { createRouteOf, createSeedOf, hostCreates } from '../utils/machineCreate';
import { canManageSettings } from '../utils/permissions';

import RefreshButton from './RefreshButton';
import ServersPanel, { useRegistry } from './ServersPanel';

const DEFAULT_SORT = [{ column: 'name', direction: 'asc' }];

const ADD_QUERY = 'add';

const ADD_HOST = 'host';

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

const withoutAdd = params => {
  const next = new URLSearchParams(params);
  next.delete(ADD_QUERY);
  return next;
};

const useAdding = asked => {
  const [held, setHeld] = useState({ asked, adding: asked });
  if (held.asked !== asked) {
    setHeld({ asked, adding: asked || held.adding });
  }
  const setAdding = useCallback(adding => setHeld(current => ({ ...current, adding })), []);
  return [held.adding, setAdding];
};

/**
 * The hosts page at `/` of a host that advertises `hosts`: one row per
 * server of `useServers`, the registry of `GET /api/servers` on the
 * server role and the one serving agent on an agent role, drawn in the
 * one `SubTable` over Name, Hostname, Hypervisors, Platform, Version and
 * Machines, every cell from the registry row alone so the table fires no
 * request per row, narrowed by the navbar binding of `useDetailSearch`
 * under `table_prefs_hosts`, Refresh in the heading's actions reading
 * the list again, and the registry's keys with it for a role that may
 * manage settings; the loading line while the list has not
 * answered, the danger alert when it failed and the empty placard while
 * no agent is registered. For a role that may manage settings the same
 * table is the registry of agents, hyperweaver-ui's servers list: the
 * registry's columns and row actions of `useRegistry` join the hosts
 * columns, Add host in the heading's actions opens the registry panel's
 * form under the heading and reads Cancel while it is open, and the
 * `add=host` query, the Datacenter node's Add host, opens the form on
 * arrival and is dropped from the route, the way the `tab` query of the
 * retired settings page was. The `create=machine` query, the Deploy
 * hand-off's deep link, moves to the page of the first host that offers a
 * create, `hostCreates`, the query and its seed kept, and stays on the
 * list with one warning notice while no host does.
 */
const HostsPage = ({ context }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const { servers, loaded, failed, refresh } = useServers();
  const [searchParams, setSearchParams] = useSearchParams();
  const asked = searchParams.get(ADD_QUERY) === ADD_HOST;
  const [adding, setAdding] = useAdding(asked);
  const manages = canManageSettings(context.user?.role);
  const folds = useFolds(`${context.prefsPrefix}_hosts`);
  const registry = useRegistry({ enabled: manages, servers, onAdded: () => setAdding(false) });
  const seed = createSeedOf(searchParams);
  const creating = seed
    ? servers.find(server => hostCreates(server, context.user?.role)) || null
    : null;
  const noticed = useRef(false);
  const ctx = { ...context, t, language: i18n.language, ...registry.ctx };
  const search = useDetailSearch({
    rows: manages ? registry.rows : servers,
    matches,
    placeholderKey: 'hosts.page.search',
    columns: manages ? [...columns, ...registry.columns] : columns,
    ctx,
    prefsKey: `${context.prefsPrefix}_hosts`,
    defaultSort: DEFAULT_SORT,
  });

  useEffect(() => {
    document.title = context.appName;
  }, [context.appName]);

  useEffect(() => {
    if (asked) {
      setSearchParams(withoutAdd(searchParams), { replace: true });
    }
  }, [asked, searchParams, setSearchParams]);

  useEffect(() => {
    if (!seed || !loaded || creating || noticed.current) {
      return;
    }
    noticed.current = true;
    notify('warning', t('hosts.deploy.noHostCreates'));
  }, [seed, loaded, creating, notify, t]);

  if (!loaded) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  if (creating) {
    return <Navigate to={createRouteOf(creating.id, seed)} replace />;
  }

  const toggleAdding = () => {
    setAdding(!adding);
    registry.reset();
  };

  const actions = (
    <>
      {manages ? (
        <button
          type="button"
          className="btn btn-sm btn-primary"
          data-action="server-add"
          onClick={toggleAdding}
        >
          {adding ? (
            <FaXmark className="me-2" aria-hidden="true" />
          ) : (
            <FaPlus className="me-2" aria-hidden="true" />
          )}
          {t(adding ? 'settings.serverManagementTab.cancel' : 'chrome.sidebarTree.addHostButton')}
        </button>
      ) : null}
      <RefreshButton
        onRefresh={() => {
          refresh();
          registry.refresh();
        }}
      />
    </>
  );

  return (
    <div className="list row" data-page="hosts">
      <PageHeader title={t('hosts.page.title')} actions={actions} />
      {failed ? (
        <div className="alert alert-danger" role="alert">
          {t('hosts.page.loadError')}
        </div>
      ) : null}
      {manages ? <ServersPanel registry={registry} adding={adding} folds={folds} /> : null}
      {servers.length === 0 ? (
        <EmptyState title={t('hosts.empty.title')} body={t('hosts.empty.body')} />
      ) : (
        <SubTable
          columns={manages ? [...columns, ...registry.columns] : columns}
          rows={search.rows}
          rowKey={hostKey}
          rowProp="server"
          RowActions={manages ? registry.RowActions : null}
          actionsProps={registry.actionsProps}
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
