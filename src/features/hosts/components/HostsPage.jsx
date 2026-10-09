import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaXmark } from 'react-icons/fa6';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import EmptyState from '../../../components/common/EmptyState';
import PageHeader from '../../../components/common/PageHeader';
import SubTable from '../../../components/common/SubTable';
import ViewToggle from '../../../components/common/ViewToggle';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useFolds } from '../../../hooks/useFolds';
import { pageContextShape } from '../../../utils/itemShape';
import { useServers } from '../hooks/useServers';
import { hostKey, hostLabel } from '../utils/hosts';
import {
  handoffOf,
  handoffReasonKey,
  handoffRouteOf,
  hostTakes,
  withoutCreateSeed,
} from '../utils/machineCreate';
import { canManageSettings } from '../utils/permissions';

import { useHandoffBanner } from './HandoffBanner';
import HostCards, { machinesKeyOf } from './HostCards';
import RefreshButton from './RefreshButton';
import ServersPanel, { useRegistry } from './ServersPanel';

const DEFAULT_SORT = [{ column: 'name', direction: 'asc' }];

const VIEWS = ['table', 'cards'];

const ADD_QUERY = 'add';

const ADD_HOST = 'host';

const hostPath = server => `/hosts/${server.id}`;

const machinesWord = (server, ctx) => ctx.t(machinesKeyOf(server));

const matches = (server, needle) =>
  [hostLabel(server), server.hostname || ''].some(text => text.toLowerCase().includes(needle));

/**
 * The hosts table's columns, each sorting by what its cell shows: the
 * label linking to the host's page, with the one reason beside it while
 * a hand-off waits and the host cannot take it, the hostname, the
 * hypervisors joined, the platform, the version and whether the registry
 * row advertises `machines`, every value the registry row already carries.
 */
const columns = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'hosts.page.name',
    value: hostLabel,
    render: (server, ctx) => (
      <>
        <Link to={hostPath(server)} className="fw-semibold">
          {hostLabel(server)}
        </Link>
        {ctx.pick && !ctx.pick.routeOf(server) ? (
          <span className="host-reason ms-2" data-note="held">
            · {ctx.t(ctx.pick.reasonKey)}
          </span>
        ) : null}
      </>
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
 * The row pick of the hosts table while a hand-off waits: a row whose
 * host can take it is a press to its landing route, a row whose host
 * cannot is held.
 *
 * @param {{ routeOf: Function }|null} pick - The page's pick
 * @param {Function} navigate - The router's navigate
 * @returns {Function|null} `rowPick(server)` of the one table, null without a pick
 */
const rowPickOf = (pick, navigate) =>
  pick
    ? server => {
        const route = pick.routeOf(server);
        return route ? { press: () => navigate(route), held: false } : { press: null, held: true };
      }
    : null;

const HostsActions = ({ manages, adding, onToggleAdding, onRefresh, view, onView }) => {
  const { t } = useTranslation();
  return (
    <>
      {manages ? (
        <button
          type="button"
          className="btn btn-sm btn-primary"
          data-action="server-add"
          onClick={onToggleAdding}
        >
          {adding ? (
            <FaXmark className="me-2" aria-hidden="true" />
          ) : (
            <FaPlus className="me-2" aria-hidden="true" />
          )}
          {t(adding ? 'settings.serverManagementTab.cancel' : 'chrome.sidebarTree.addHostButton')}
        </button>
      ) : null}
      <RefreshButton onRefresh={onRefresh} />
      <ViewToggle view={view} onChange={onView} />
    </>
  );
};

HostsActions.propTypes = {
  manages: PropTypes.bool.isRequired,
  adding: PropTypes.bool.isRequired,
  onToggleAdding: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  view: PropTypes.oneOf(VIEWS).isRequired,
  onView: PropTypes.func.isRequired,
};

/**
 * The pick of the hosts page while a hand-off waits and more than one
 * host can take it: `routeOf` answers the landing route of a host that
 * can and the empty string for one that cannot, and `reasonKey` the one
 * reason the held hosts read; null while no hand-off waits or at most one
 * host takes it.
 *
 * @param {Object} options - The hand-off, the takers and the person's role
 * @returns {{ routeOf: Function, reasonKey: string }|null} The pick
 */
const pickOf = ({ handoff, takers, role }) => {
  if (!handoff || takers.length < 2) {
    return null;
  }
  const { word, seed } = handoff;
  return {
    routeOf: server =>
      hostTakes(server, word, seed, role) ? handoffRouteOf(server.id, word, seed) : '',
    reasonKey: handoffReasonKey(word, seed),
  };
};

/**
 * The hosts page at `/` of a host that advertises `hosts`: one row per
 * server of `useServers`, the registry of `GET /api/servers` on the
 * server role and the one serving agent on an agent role, drawn in the
 * one `SubTable` over Name, Hostname, Hypervisors, Platform, Version and
 * Machines, or as one card a host by the view toggle in the heading's
 * action pane, the view kept as `view` in `table_prefs_hosts` beside the
 * sort and the hidden columns, every cell from the registry row alone so
 * the page fires no request per row, narrowed by the navbar binding of
 * `useDetailSearch`, Refresh in the heading's actions reading the list
 * again, and the registry's keys with it for a role that may manage
 * settings; the loading line while the list has not answered, the danger
 * alert when it failed and the empty placard while no agent is
 * registered. For a role that may manage settings the same table is the
 * registry of agents, hyperweaver-ui's servers list: the registry's
 * columns and row actions of `useRegistry` join the hosts columns, Add
 * host in the heading's actions opens the registry panel's form under
 * the heading and reads Cancel while it is open, and the `add=host`
 * query, the Datacenter node's Add host, opens the form on arrival and is
 * dropped from the route. The `create` query, the Deploy hand-off's deep
 * link, counts the hosts that can take its word, `hostTakes`: exactly one
 * moves the hand-off to that host's landing route, `handoffRouteOf`, the
 * query and its seed kept; none keeps the page under the hand-off's
 * banner alone; several draw the banner and make the page the pick, a
 * host that can take it one press, its whole card or its whole row, to
 * its landing route, and a host that cannot greyed with its one reason;
 * the banner's dismiss drops the hand-off from the route.
 */
const HostsPage = ({ context }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { servers, loaded, failed, refresh } = useServers();
  const [searchParams, setSearchParams] = useSearchParams();
  const asked = searchParams.get(ADD_QUERY) === ADD_HOST;
  const [adding, setAdding] = useAdding(asked);
  const role = context.user?.role;
  const manages = canManageSettings(role);
  const folds = useFolds(`${context.prefsPrefix}_hosts`);
  const registry = useRegistry({ enabled: manages, servers, onAdded: () => setAdding(false) });
  const handoff = handoffOf(searchParams);
  const takers = handoff
    ? servers.filter(server => hostTakes(server, handoff.word, handoff.seed, role))
    : [];
  const landing = handoff && takers.length === 1 ? takers[0] : null;
  const pick = pickOf({ handoff, takers, role });
  const ctx = { ...context, t, language: i18n.language, pick, ...registry.ctx };
  const search = useDetailSearch({
    rows: manages ? registry.rows : servers,
    matches,
    placeholderKey: 'hosts.page.search',
    columns: manages ? [...columns, ...registry.columns] : columns,
    ctx,
    prefsKey: `${context.prefsPrefix}_hosts`,
    views: VIEWS,
    defaultSort: DEFAULT_SORT,
  });
  const dropHandoff = useCallback(
    () => setSearchParams(current => withoutCreateSeed(current), { replace: true }),
    [setSearchParams]
  );

  useHandoffBanner({
    handoff,
    shown: Boolean(handoff) && loaded && !landing,
    none: takers.length === 0,
    onDismissed: dropHandoff,
  });

  useEffect(() => {
    document.title = context.appName;
  }, [context.appName]);

  useEffect(() => {
    if (asked) {
      setSearchParams(withoutAdd(searchParams), { replace: true });
    }
  }, [asked, searchParams, setSearchParams]);

  if (!loaded) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  if (landing) {
    return <Navigate to={handoffRouteOf(landing.id, handoff.word, handoff.seed)} replace />;
  }

  const actions = (
    <HostsActions
      manages={manages}
      adding={adding}
      onToggleAdding={() => {
        setAdding(!adding);
        registry.reset();
      }}
      onRefresh={() => {
        refresh();
        registry.refresh();
      }}
      view={search.view}
      onView={search.setView}
    />
  );

  const emptyText = t(search.filtering ? 'pages.noMatches' : 'hosts.empty.title');

  const list =
    search.view === 'cards' ? (
      <HostCards rows={search.rows} pick={pick} emptyText={emptyText} />
    ) : (
      <SubTable
        columns={manages ? [...columns, ...registry.columns] : columns}
        rows={search.rows}
        rowKey={hostKey}
        rowProp="server"
        rowPick={rowPickOf(pick, navigate)}
        RowActions={manages ? registry.RowActions : null}
        actionsProps={registry.actionsProps}
        sort={search.sort}
        onSort={search.setSort}
        hiddenColumns={search.hiddenColumns}
        widths={search.widths}
        onResize={search.setColumnWidth}
        ctx={ctx}
        emptyText={emptyText}
      />
    );

  return (
    <div className="list row" data-page="hosts" data-view={search.view}>
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
        list
      )}
    </div>
  );
};

HostsPage.propTypes = {
  context: pageContextShape.isRequired,
};

export default HostsPage;
