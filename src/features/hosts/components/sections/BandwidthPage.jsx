import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useFolds } from '../../../../hooks/useFolds';
import { pageContextShape } from '../../../../utils/itemShape';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { useHostReadingsRefresh } from '../../hooks/useHostReadings';
import { useHostSeries, useHostSeriesQuery, useHostSeriesRefresh } from '../../hooks/useHostSeries';
import { matchesUsage, usageRows } from '../../utils/networking';
import NetworkingCharts from '../NetworkingCharts';
import { BANDWIDTH_COLUMNS } from '../NetworkingColumns';
import NetworkingTable from '../NetworkingTable';
import QuerySelects from '../QuerySelects';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

const TOTAL_SORT = [{ column: 'total', direction: 'desc' }];

const FOLD_TITLES = {
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

/**
 * The Bandwidth page of a host: the heading counting the interfaces
 * with a sample, the time window and Refresh in its pane, and under it
 * the bandwidth table, a folding glass section over
 * the one table narrowed by the page's search, and the bandwidth
 * charts, all from the one series `useHostSeries` holds of the host's
 * network usage; the folds kept under `table_prefs_bandwidth`. Refresh
 * reads every held answer of the host and every drawn series again.
 */
const BandwidthPage = ({ id, server, context, section, host, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const refreshReadings = useHostReadingsRefresh();
  const refreshSeries = useHostSeriesRefresh();
  const { query, setQuery } = useHostSeriesQuery(id);
  const folds = useFolds(`${context.prefsPrefix}_${section}`);
  const usage = useHostSeries(id, 'network');
  const usageList = useMemo(() => usageRows(usage.rows), [usage.rows]);
  const ctx = { ...context, t, language: i18n.language };
  const search = useHostManageSearch({
    section,
    tables: {
      bandwidth: tableOf({
        key: 'bandwidth',
        labelKey: 'host.bandwidthTable.title',
        rows: usageList,
        columns: BANDWIDTH_COLUMNS,
        matches: matchesUsage,
        defaultSort: TOTAL_SORT,
        offered: usage.offered,
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
      count={usage.offered && usage.loaded ? usageList.length : null}
      actions={actions}
    >
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
    </SectionPane>
  );
};

BandwidthPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  host: PropTypes.shape({ label: PropTypes.string.isRequired }).isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default BandwidthPage;
