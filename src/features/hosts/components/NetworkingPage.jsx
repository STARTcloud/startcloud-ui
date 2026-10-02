import PropTypes from 'prop-types';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import NotAvailableStub from '../../../components/common/NotAvailableStub';
import PageHeader from '../../../components/common/PageHeader';
import { useStatus } from '../../../contexts/StatusContext';
import { useFolds } from '../../../hooks/useFolds';
import { pageContextShape } from '../../../utils/itemShape';
import { useHostNetworkingSearch } from '../hooks/useHostNetworkingSearch';
import { useHostReading, useHostReadingsRefresh } from '../hooks/useHostReadings';
import { useHostRow } from '../hooks/useHostRow';
import { useHostSeries, useHostSeriesQuery, useHostSeriesRefresh } from '../hooks/useHostSeries';
import { useHostStats } from '../hooks/useHostStats';
import { useNetworkingManagementReads } from '../hooks/useNetworkingManagementReads';
import { useServers } from '../hooks/useServers';
import { hostHasFeature } from '../utils/capabilities';
import { hostLabel, isServerRole } from '../utils/hosts';
import {
  ADDRESS_FILTERS,
  INTERFACE_FILTERS,
  NETWORKING_TOKENS,
  ROUTE_FILTERS,
  addressKey,
  addressRows,
  hostHasNetworking,
  matchesAddress,
  matchesInterface,
  matchesRoute,
  matchesUsage,
  routeKey,
  routeRows,
  usageRows,
} from '../utils/networking';
import { latestPer } from '../utils/resources';

import { AGGREGATE_COLUMNS } from './AggregateTable';
import { BRIDGE_COLUMNS } from './BridgeTable';
import { ETHERSTUB_COLUMNS } from './EtherstubTable';
import HostTabs from './HostTabs';
import { MANAGED_ADDRESS_COLUMNS } from './IpAddressTableManagement';
import NetworkHostnameManagement from './NetworkHostnameManagement';
import NetworkingCharts from './NetworkingCharts';
import {
  ADDRESS_COLUMNS,
  BANDWIDTH_COLUMNS,
  ROUTE_COLUMNS,
  interfaceColumnsFor,
} from './NetworkingColumns';
import NetworkingSummary from './NetworkingSummary';
import NetworkingTable from './NetworkingTable';
import { SPACE_COLUMNS } from './NetworkSpaces/NetworkSpacesPanel';
import TopologyPanel from './NetworkTopology/TopologyPanel';
import QuerySelects from './QuerySelects';
import RefreshButton from './RefreshButton';
import { VLAN_COLUMNS } from './VlanTable';
import { VNIC_COLUMNS } from './VnicTable';

const INTERFACE_SORT = [{ column: 'interface', direction: 'asc' }];

const LINK_SORT = [{ column: 'link', direction: 'asc' }];

const TOTAL_SORT = [{ column: 'total', direction: 'desc' }];

const TOKEN_LABEL = NETWORKING_TOKENS.join(' / ');

const FOLD_TITLES = {
  topology: ['pages.hostNetworking.show', 'pages.hostNetworking.hide'],
  addresses: ['host.ipAddressTable.expand', 'host.ipAddressTable.collapse'],
  routes: ['host.routingTable.expandSection', 'host.routingTable.collapseSection'],
  interfaces: ['host.interfacesTable.expandSection', 'host.interfacesTable.collapseSection'],
  bandwidth: ['host.bandwidthTable.expand', 'host.bandwidthTable.collapse'],
};

const MANAGEMENT_COLUMNS = {
  managedAddresses: MANAGED_ADDRESS_COLUMNS,
  vnics: VNIC_COLUMNS,
  vlans: VLAN_COLUMNS,
  etherstubs: ETHERSTUB_COLUMNS,
  bridges: BRIDGE_COLUMNS,
  aggregates: AGGREGATE_COLUMNS,
  spaces: SPACE_COLUMNS,
};

const labelOf = ({ status, server, id, stats }) => {
  if (isServerRole(status)) {
    return server ? hostLabel(server) : String(id);
  }
  return stats?.hostname || String(id);
};

const foldOf = ({ folds, key, t }) => {
  const folded = folds.folded(key);
  const [expand, collapse] = FOLD_TITLES[key];
  return { folded, onFold: () => folds.toggle(key), title: t(folded ? expand : collapse) };
};

/**
 * The networking page of a host that offers it, the frame and its
 * surfaces in hyperweaver-ui's order: the heading with the time window,
 * the resolution and Refresh, the tab row of the host's pages, the
 * network summary, the network topology, the four read tables narrowed
 * by the page's one search binding, each under a heading that folds, the
 * bandwidth charts, and under them hyperweaver-ui's management, the
 * hostname, the hosts file, the DNS, the VNICs, the VLANs, the
 * addresses, the aggregates, the bridges, the etherstubs and the network
 * spaces, every list of them in the one search binding too, every read
 * the copy the hosts feature's context holds of the host and every fold
 * kept under the page's `table_prefs_networking`.
 */
const NetworkingFrame = ({ id, server, context }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const { refresh: refreshServers } = useServers();
  const { stats, refresh: refreshStats } = useHostStats(id);
  const refreshReadings = useHostReadingsRefresh();
  const refreshSeries = useHostSeriesRefresh();
  const { query, setQuery } = useHostSeriesQuery(id);
  const folds = useFolds(`${context.prefsPrefix}_networking`);
  const addresses = useHostReading(id, 'ip-addresses');
  const routes = useHostReading(id, 'routes');
  const interfaces = useHostReading(id, 'interfaces');
  const usage = useHostSeries(id, 'network');
  const machines = hostHasFeature(server, 'machines');
  const interfaceColumns = useMemo(() => interfaceColumnsFor({ id, machines }), [id, machines]);
  const addressList = useMemo(() => addressRows(addresses.data), [addresses.data]);
  const routeList = useMemo(() => routeRows(routes.data), [routes.data]);
  const interfaceList = useMemo(
    () => latestPer(interfaces.data?.interfaces, row => row.link),
    [interfaces.data]
  );
  const usageList = useMemo(() => usageRows(usage.rows), [usage.rows]);
  const management = useNetworkingManagementReads(id, MANAGEMENT_COLUMNS, server);
  const ctx = { ...context, t, language: i18n.language };
  const search = useHostNetworkingSearch({
    tables: {
      ...management.tables,
      addresses: {
        key: 'addresses',
        labelKey: 'host.ipAddressTable.title',
        rows: addressList,
        columns: ADDRESS_COLUMNS,
        matches: matchesAddress,
        filterGroups: ADDRESS_FILTERS,
        defaultSort: INTERFACE_SORT,
        offered: addresses.offered,
      },
      routes: {
        key: 'routes',
        labelKey: 'host.routingTable.routingTable',
        rows: routeList,
        columns: ROUTE_COLUMNS,
        matches: matchesRoute,
        filterGroups: ROUTE_FILTERS,
        defaultSort: INTERFACE_SORT,
        offered: routes.offered,
      },
      interfaces: {
        key: 'interfaces',
        labelKey: 'hosts.overview.interfaces',
        rows: interfaceList,
        columns: interfaceColumns,
        matches: matchesInterface,
        filterGroups: INTERFACE_FILTERS,
        defaultSort: LINK_SORT,
        offered: interfaces.offered,
      },
      bandwidth: {
        key: 'bandwidth',
        labelKey: 'host.bandwidthTable.title',
        rows: usageList,
        columns: BANDWIDTH_COLUMNS,
        matches: matchesUsage,
        defaultSort: TOTAL_SORT,
        offered: usage.offered,
      },
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
  });
  const label = labelOf({ status, server, id, stats });
  const title = t('host.networkingHeader.title');

  useEffect(() => {
    document.title = `${title} · ${label}`;
  }, [title, label]);

  const refresh = () => {
    refreshServers();
    refreshStats();
    refreshReadings(id);
    refreshSeries(id);
  };

  const actions = (
    <>
      {usage.offered ? (
        <QuerySelects query={query} onChange={setQuery} scope="networkingHeader" />
      ) : null}
      <RefreshButton onRefresh={refresh} />
    </>
  );

  return (
    <div className="list row" data-page="networking">
      <PageHeader title={title} subtitle={label} actions={actions} />
      <HostTabs id={id} />
      {interfaces.offered ? <NetworkingSummary interfaces={interfaceList} folds={folds} /> : null}
      <TopologyPanel id={id} fold={foldOf({ folds, key: 'topology', t })} />
      {addresses.offered ? (
        <NetworkingTable
          panel="networking-addresses"
          title={t('host.ipAddressTable.title')}
          columns={ADDRESS_COLUMNS}
          table={search.tables.addresses}
          rowKey={addressKey}
          ctx={ctx}
          emptyKey="host.ipAddressTable.noData"
          reading={addresses}
          filtering={search.filtering}
          fold={foldOf({ folds, key: 'addresses', t })}
        />
      ) : null}
      {routes.offered ? (
        <NetworkingTable
          panel="networking-routes"
          title={t('host.routingTable.routingTable')}
          columns={ROUTE_COLUMNS}
          table={search.tables.routes}
          rowKey={routeKey}
          ctx={ctx}
          emptyKey="host.routingTable.noRoutingTableData"
          reading={routes}
          filtering={search.filtering}
          fold={foldOf({ folds, key: 'routes', t })}
        />
      ) : null}
      {interfaces.offered ? (
        <NetworkingTable
          panel="networking-interfaces"
          title={t('host.interfacesTable.networkInterfaces', { total: interfaceList.length })}
          columns={interfaceColumns}
          table={search.tables.interfaces}
          rowKey={row => row.link}
          ctx={ctx}
          emptyKey="host.interfacesTable.emptyState"
          reading={interfaces}
          filtering={search.filtering}
          fold={foldOf({ folds, key: 'interfaces', t })}
          resetTitle={t('host.interfacesTable.resetSortTitle')}
        />
      ) : null}
      {usage.offered ? (
        <NetworkingTable
          panel="networking-bandwidth"
          title={t('host.bandwidthTable.title')}
          columns={BANDWIDTH_COLUMNS}
          table={search.tables.bandwidth}
          rowKey={row => row.link}
          ctx={ctx}
          emptyKey="host.bandwidthTable.noData"
          reading={usage}
          filtering={search.filtering}
          fold={foldOf({ folds, key: 'bandwidth', t })}
          resetTitle={t('host.bandwidthTable.resetSort')}
        />
      ) : null}
      <NetworkingCharts id={id} host={label} folds={folds} />
      <NetworkHostnameManagement
        id={id}
        server={server}
        role={context.user?.role}
        management={management}
        tables={search.tables}
        ctx={ctx}
        filtering={search.filtering}
        folds={folds}
      />
    </div>
  );
};

NetworkingFrame.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
};

/**
 * What the networking route draws for a host the list of servers does
 * not hold, what the host page draws for such an id: the heading with
 * the id or the hostname the stats answered, and the danger alert when
 * the host's stats failed, the loading line until they answered.
 */
const UnknownHost = ({ id }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { refresh: refreshServers } = useServers();
  const { stats, loaded, failed, refresh: refreshStats } = useHostStats(id);

  if (!loaded) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  const refresh = () => {
    refreshServers();
    refreshStats();
  };

  return (
    <div className="list row" data-page="networking-unknown">
      <PageHeader
        title={t('host.networkingHeader.title')}
        subtitle={labelOf({ status, server: null, id, stats })}
        actions={<RefreshButton onRefresh={refresh} />}
      />
      {failed ? (
        <div className="alert alert-danger" role="alert">
          {t('hosts.host.loadError')}
        </div>
      ) : null}
    </div>
  );
};

UnknownHost.propTypes = {
  id: PropTypes.string.isRequired,
};

/**
 * The networking of one host at `/hosts/{id}/networking`, hyperweaver-ui's
 * host networking page, its frame and its read surfaces in its order:
 * the heading with the host under it, the time window and the resolution
 * of the host's series and Refresh; the tab row of the host's pages; the
 * network summary, a card with its five counts; the IP addresses, the
 * routing table, the network interfaces and the bandwidth of each
 * interface, the newest sample held of it, each a glass section over the
 * one `SubTable` under a heading that folds, narrowed together by the
 * page's one navbar binding (`useHostNetworkingSearch`); then the
 * bandwidth charts; then hyperweaver-ui's management as folding
 * sections, each behind the tokens its read names and every list in the
 * one binding, and the network topology after the summary, drawn over
 * the copies the page already holds. The headings of the interfaces and
 * of the bandwidth are hyperweaver-ui's buttons, a click dropping the
 * sort a person chose.
 * The page is behind `vnics` or `network-spaces`, hyperweaver-ui's gate
 * checked strictly on the host's own row: a host that lists neither
 * draws the not-available stub and nothing is asked of it, and an id the
 * list of servers does not hold draws what the host page draws for it.
 * Every table is behind the tokens its read names, the addresses, the
 * interfaces and the bandwidth behind `monitoring` and the routing table
 * behind `monitoring` and `vnics`, so a host that lists a token of the
 * page and no `monitoring` draws the frame and none of the reads is
 * asked. The interfaces and the network usage are the copies the host
 * page draws, read once for both. Refresh reads again the list of
 * servers, the host's stats, every answer held of the host and the
 * history of every series drawn of it, and nothing reads on a clock:
 * hyperweaver-ui's refresh interval, its Auto and Manual switch and the
 * timer behind them are not carried over.
 */
const NetworkingPage = ({ id, context }) => {
  const { t } = useTranslation();
  const { loaded: listed } = useServers();
  const server = useHostRow(id);

  if (!listed) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  if (!server) {
    return <UnknownHost id={id} />;
  }

  if (!hostHasNetworking(server)) {
    return <NotAvailableStub title={t('chrome.layout.hostNetworking')} tokenLabel={TOKEN_LABEL} />;
  }

  return <NetworkingFrame id={id} server={server} context={context} />;
};

NetworkingPage.propTypes = {
  id: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
};

export default NetworkingPage;
