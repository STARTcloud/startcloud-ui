import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../../contexts/StatusContext';
import { useFolds } from '../../../../hooks/useFolds';
import { pageContextShape } from '../../../../utils/itemShape';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { useHostReading, useHostReadingsRefresh } from '../../hooks/useHostReadings';
import { useHostSeries, useHostSeriesQuery, useHostSeriesRefresh } from '../../hooks/useHostSeries';
import { useNetworkingTools } from '../../hooks/useNetworkingTools';
import { hostHasFeature } from '../../utils/capabilities';
import {
  ADDRESS_FILTERS,
  INTERFACE_FILTERS,
  ROUTE_FILTERS,
  addressKey,
  addressRows,
  matchesAddress,
  matchesInterface,
  matchesRoute,
  matchesUsage,
  routeKey,
  routeRows,
  usageRows,
} from '../../utils/networking';
import {
  MANAGED_ADDRESS_FILTERS,
  managedAddressKey,
  matchesManagedAddress,
  uniqueRows,
} from '../../utils/networkingManagement';
import { latestPer } from '../../utils/resources';
import IpAddressManagement from '../IpAddressManagement';
import { MANAGED_ADDRESS_COLUMNS } from '../IpAddressTableManagement';
import NetworkingCharts from '../NetworkingCharts';
import {
  ADDRESS_COLUMNS,
  BANDWIDTH_COLUMNS,
  ROUTE_COLUMNS,
  interfaceColumnsFor,
} from '../NetworkingColumns';
import NetworkingSummary from '../NetworkingSummary';
import NetworkingTable from '../NetworkingTable';
import TopologyPanel from '../NetworkTopology/TopologyPanel';
import QuerySelects from '../QuerySelects';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';
import TaskDialog from '../TaskDialog';

const INTERFACE_SORT = [{ column: 'interface', direction: 'asc' }];

const LINK_SORT = [{ column: 'link', direction: 'asc' }];

const TOTAL_SORT = [{ column: 'total', direction: 'desc' }];

const NO_ROWS = [];

const FOLD_TITLES = {
  topology: ['pages.hostNetworking.show', 'pages.hostNetworking.hide'],
  addresses: ['host.ipAddressTable.expand', 'host.ipAddressTable.collapse'],
  routes: ['host.routingTable.expandSection', 'host.routingTable.collapseSection'],
  interfaces: ['host.interfacesTable.expandSection', 'host.interfacesTable.collapseSection'],
  bandwidth: ['host.bandwidthTable.expand', 'host.bandwidthTable.collapse'],
};

const foldOf = ({ folds, key, t }) => {
  const folded = folds.folded(key);
  const [expand, collapse] = FOLD_TITLES[key] || ['', ''];
  return {
    folded,
    onFold: () => folds.toggle(key),
    title: expand ? t(folded ? expand : collapse) : '',
  };
};

const listOf = (data, member) => (Array.isArray(data?.[member]) ? data[member] : NO_ROWS);

/**
 * The Interfaces page of a host: the heading counting the interfaces,
 * the time window, the resolution and Refresh in its pane, and under it
 * the network summary, the topology, the IP addresses, the routing
 * table, the interfaces and the bandwidth tables, each a folding glass
 * section over one table narrowed by the page's search, the bandwidth
 * charts and the IP address management behind the tokens its read
 * names; the folds kept under `table_prefs_interfaces`. Refresh reads
 * every held answer of the host and every drawn series again.
 */
const InterfacesPage = ({ id, server, context, section, host, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const refreshReadings = useHostReadingsRefresh();
  const refreshSeries = useHostSeriesRefresh();
  const { query, setQuery } = useHostSeriesQuery(id);
  const folds = useFolds(`${context.prefsPrefix}_${section}`);
  const addresses = useHostReading(id, 'ip-addresses');
  const routes = useHostReading(id, 'routes');
  const interfaces = useHostReading(id, 'interfaces');
  const managed = useHostReading(id, 'network-addresses');
  const usage = useHostSeries(id, 'network');
  const tools = useNetworkingTools();
  const machines = hostHasFeature(server, 'machines');
  const interfaceColumns = useMemo(() => interfaceColumnsFor({ id, machines }), [id, machines]);
  const addressList = useMemo(() => addressRows(addresses.data), [addresses.data]);
  const routeList = useMemo(() => routeRows(routes.data), [routes.data]);
  const interfaceList = useMemo(
    () => latestPer(interfaces.data?.interfaces, row => row.link),
    [interfaces.data]
  );
  const usageList = useMemo(() => usageRows(usage.rows), [usage.rows]);
  const managedList = useMemo(
    () => uniqueRows(listOf(managed.data, 'addresses'), managedAddressKey),
    [managed.data]
  );
  const ctx = { ...context, t, language: i18n.language };
  const search = useHostManageSearch({
    section,
    tables: {
      addresses: tableOf({
        key: 'addresses',
        labelKey: 'host.ipAddressTable.title',
        rows: addressList,
        columns: ADDRESS_COLUMNS,
        matches: matchesAddress,
        filterGroups: ADDRESS_FILTERS,
        defaultSort: INTERFACE_SORT,
        offered: addresses.offered,
      }),
      routes: tableOf({
        key: 'routes',
        labelKey: 'host.routingTable.routingTable',
        rows: routeList,
        columns: ROUTE_COLUMNS,
        matches: matchesRoute,
        filterGroups: ROUTE_FILTERS,
        defaultSort: INTERFACE_SORT,
        offered: routes.offered,
      }),
      interfaces: tableOf({
        key: 'interfaces',
        labelKey: 'hosts.overview.interfaces',
        rows: interfaceList,
        columns: interfaceColumns,
        matches: matchesInterface,
        filterGroups: INTERFACE_FILTERS,
        defaultSort: LINK_SORT,
        offered: interfaces.offered,
      }),
      bandwidth: tableOf({
        key: 'bandwidth',
        labelKey: 'host.bandwidthTable.title',
        rows: usageList,
        columns: BANDWIDTH_COLUMNS,
        matches: matchesUsage,
        defaultSort: TOTAL_SORT,
        offered: usage.offered,
      }),
      managedAddresses: tableOf({
        key: 'managedAddresses',
        labelKey: 'host.ipAddressManagement.title',
        rows: managedList,
        columns: MANAGED_ADDRESS_COLUMNS,
        matches: matchesManagedAddress,
        filterGroups: MANAGED_ADDRESS_FILTERS,
        defaultSort: INTERFACE_SORT,
        offered: managed.offered,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'hosts.networking.search',
  });

  const refresh = () => {
    onRefresh();
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
    <SectionPane
      section={section}
      server={server}
      count={interfaces.offered && interfaces.loaded ? interfaceList.length : null}
      actions={actions}
    >
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
      <NetworkingCharts id={id} host={host.label} folds={folds} />
      {managed.offered ? (
        <IpAddressManagement
          id={id}
          server={server}
          role={context.user?.role}
          rows={managedList}
          reading={managed}
          table={search.tables.managedAddresses}
          ctx={ctx}
          filtering={search.filtering}
          fold={foldOf({ folds, key: 'manage-addresses', t })}
          tools={tools}
        />
      ) : null}
      {tools.task ? (
        <TaskDialog status={status} id={id} task={tools.task.row} onHide={tools.closeTask} />
      ) : null}
    </SectionPane>
  );
};

InterfacesPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  host: PropTypes.shape({ label: PropTypes.string.isRequired }).isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default InterfacesPage;
