import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

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

/**
 * The Interfaces page of a host: one heading, the interfaces table's own,
 * the section's title, its press dropping a sort a person chose, counting
 * the interfaces the page's search leaves with Refresh in its pane, and
 * under it the one table, a glass section, its trend column a sparkline
 * an interface over the host's window from the one network series
 * `useHostSeries` holds. Refresh reads every held answer of the host and
 * every drawn series again.
 */
const InterfacesPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const refreshReadings = useHostReadingsRefresh();
  const refreshSeries = useHostSeriesRefresh();
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
