import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useFolds } from '../../../../hooks/useFolds';
import { pageContextShape } from '../../../../utils/itemShape';
import { ChartControlsContext, useChartControlsState } from '../../hooks/useChartControls';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { useHostReading, useHostReadingsRefresh } from '../../hooks/useHostReadings';
import { useHostSeries, useHostSeriesQuery, useHostSeriesRefresh } from '../../hooks/useHostSeries';
import { sectionTitle } from '../../pages';
import { hostHasFeature } from '../../utils/capabilities';
import { INTERFACE_FILTERS, matchesInterface } from '../../utils/networking';
import { latestPer } from '../../utils/resources';
import { networkSeries } from '../../utils/series';
import { interfaceColumnsFor } from '../NetworkingColumns';
import NetworkingTable from '../NetworkingTable';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

const LINK_SORT = [{ column: 'link', direction: 'asc' }];

const FOLD_TITLES = {
  interfaces: ['host.interfacesTable.expandSection', 'host.interfacesTable.collapseSection'],
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
 * The Interfaces page of a host: one heading, the interfaces table's own,
 * the section's title, its press dropping a sort a person chose, counting
 * the interfaces the page's search leaves with Refresh in its pane and the
 * chevron last, and under it the one table, a folding glass section, its
 * trend column a sparkline an interface over the host's window from the
 * one network series `useHostSeries` holds; the fold kept under
 * `table_prefs_interfaces`. Refresh reads every held answer of the host
 * and every drawn series again.
 */
const InterfacesPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const refreshReadings = useHostReadingsRefresh();
  const refreshSeries = useHostSeriesRefresh();
  const folds = useFolds(`${context.prefsPrefix}_${section}`);
  const { query } = useHostSeriesQuery(id);
  const controls = useChartControlsState(query.window);
  const interfaces = useHostReading(id, 'interfaces');
  const usage = useHostSeries(id, 'network');
  const entities = useMemo(() => networkSeries(usage.rows), [usage.rows]);
  const machines = hostHasFeature(server, 'machines');
  const interfaceColumns = useMemo(
    () => interfaceColumnsFor({ id, machines, entities }),
    [id, machines, entities]
  );
  const interfaceList = useMemo(
    () => latestPer(interfaces.data?.interfaces, row => row.link),
    [interfaces.data]
  );
  const ctx = { ...context, t, language: i18n.language };
  const search = useHostManageSearch({
    section,
    tables: {
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
    <ChartControlsContext.Provider value={controls}>
      <SectionPane section={section} server={server} headed={!interfaces.offered}>
        {interfaces.offered ? (
          <NetworkingTable
            panel="networking-interfaces"
            title={sectionTitle(section, server, '', t)}
            count={interfaces.loaded ? search.tables.interfaces.rows.length : null}
            actions={<RefreshButton onRefresh={refresh} />}
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
      </SectionPane>
    </ChartControlsContext.Provider>
  );
};

InterfacesPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default InterfacesPage;
