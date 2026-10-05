import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useFolds } from '../../../../hooks/useFolds';
import { pageContextShape } from '../../../../utils/itemShape';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { useHostReading, useHostReadingsRefresh } from '../../hooks/useHostReadings';
import { useHostSeriesRefresh } from '../../hooks/useHostSeries';
import { ROUTE_FILTERS, matchesRoute, routeKey, routeRows } from '../../utils/networking';
import { ROUTE_COLUMNS } from '../NetworkingColumns';
import NetworkingTable from '../NetworkingTable';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

const INTERFACE_SORT = [{ column: 'interface', direction: 'asc' }];

const FOLD_TITLES = {
  routes: ['host.routingTable.expandSection', 'host.routingTable.collapseSection'],
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

/**
 * The Routing table page of a host: the heading counting the routes and
 * Refresh in its pane, and under it the routing table, a folding glass
 * section over the one table narrowed by the page's search; the fold
 * kept under `table_prefs_routes`. Refresh reads every held answer of
 * the host and every drawn series again.
 */
const RoutesPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const refreshReadings = useHostReadingsRefresh();
  const refreshSeries = useHostSeriesRefresh();
  const folds = useFolds(`${context.prefsPrefix}_${section}`);
  const routes = useHostReading(id, 'routes');
  const routeList = useMemo(() => routeRows(routes.data), [routes.data]);
  const ctx = { ...context, t, language: i18n.language };
  const search = useHostManageSearch({
    section,
    tables: {
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

  return (
    <SectionPane
      section={section}
      server={server}
      count={routes.offered && routes.loaded ? routeList.length : null}
      actions={<RefreshButton onRefresh={refresh} />}
    >
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
    </SectionPane>
  );
};

RoutesPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default RoutesPage;
