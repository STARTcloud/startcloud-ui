import PropTypes from 'prop-types';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStatus } from '../../../../contexts/StatusContext';
import { useFolds } from '../../../../hooks/useFolds';
import { pageContextShape } from '../../../../utils/itemShape';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { useHostReading, useHostReadingsRefresh } from '../../hooks/useHostReadings';
import { useHostSeries, useHostSeriesQuery, useHostSeriesRefresh } from '../../hooks/useHostSeries';
import { useZfsTools } from '../../hooks/useZfsTools';
import {
  DATASET_FILTERS,
  POOL_FILTERS,
  POOL_IO_FILTERS,
  datasetRows,
  diskRows,
  matchesDataset,
  matchesPool,
  matchesPoolIo,
  poolIoRows,
  poolRows,
} from '../../utils/StorageUtils';
import DatasetsTable, { DATASET_COLUMNS } from '../DatasetsTable';
import PoolIOTable, { POOL_IO_COLUMNS } from '../PoolIOTable';
import PoolsTable, { POOL_COLUMNS } from '../PoolsTable';
import SectionPane from '../SectionPane';
import StorageCharts from '../StorageCharts';
import StorageHeader from '../StorageHeader';
import StorageSummary from '../StorageSummary';
import TaskDialog from '../TaskDialog';
import ZfsDatasetsPanel from '../ZfsDatasetsPanel';
import ZfsPoolsPanel from '../ZfsPoolsPanel';

const POOL_SORT = [{ column: 'pool', direction: 'asc' }];

const NAME_SORT = [{ column: 'name', direction: 'asc' }];

const NO_ROWS = [];

const NO_SERIES = { rows: NO_ROWS, loaded: true, failed: false, offered: false };

const POOL_CHARTS = ['pools'];

const FOLD_TITLES = {
  pools: ['host.poolsTable.expandSection', 'host.poolsTable.collapseSection'],
  datasets: ['host.datasetsTable.expand', 'host.datasetsTable.collapse'],
  poolIo: ['host.poolIOTable.expandSection', 'host.poolIOTable.collapseSection'],
};

const foldOf = ({ folds, key, t }) => {
  const folded = folds.folded(key);
  const [expand, collapse] = FOLD_TITLES[key];
  return { folded, onFold: () => folds.toggle(key), title: t(folded ? expand : collapse) };
};

/**
 * The Pools and datasets page of a host, behind `zfs`: the heading
 * counting the pools, the time window and Refresh in its pane, and
 * under it the storage summary, the pools, datasets and
 * pool I/O tables, each one table narrowed by the page's search under a
 * folding heading, the pool charts, the ZFS pool manager's cards and the
 * dataset tree, every write a queued task through `useZfsTools`; the
 * folds kept under `table_prefs_pools`.
 */
const PoolsPage = ({ id, server, context, section, host, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const refreshReadings = useHostReadingsRefresh();
  const refreshSeries = useHostSeriesRefresh();
  const { query, setQuery } = useHostSeriesQuery(id);
  const folds = useFolds(`${context.prefsPrefix}_${section}`);
  const pools = useHostReading(id, 'pools');
  const datasets = useHostReading(id, 'datasets');
  const disks = useHostReading(id, 'disks');
  const poolIo = useHostSeries(id, 'pool-io');
  const [turn, setTurn] = useState(0);
  const bump = useCallback(() => setTurn(current => current + 1), []);
  const tools = useZfsTools({ id, onSettled: bump });
  const poolList = useMemo(() => poolRows(pools.data), [pools.data]);
  const datasetList = useMemo(() => datasetRows(datasets.data), [datasets.data]);
  const diskList = useMemo(() => diskRows(disks.data), [disks.data]);
  const poolIoList = useMemo(() => poolIoRows(poolIo.rows), [poolIo.rows]);
  const ctx = { ...context, t, language: i18n.language };
  const search = useHostManageSearch({
    section,
    tables: {
      pools: tableOf({
        key: 'pools',
        labelKey: 'host.storageSummary.totalPools',
        rows: poolList,
        columns: POOL_COLUMNS,
        matches: matchesPool,
        filterGroups: POOL_FILTERS,
        defaultSort: POOL_SORT,
        offered: pools.offered,
      }),
      datasets: tableOf({
        key: 'datasets',
        labelKey: 'host.storageSummary.totalDatasets',
        rows: datasetList,
        columns: DATASET_COLUMNS,
        matches: matchesDataset,
        filterGroups: DATASET_FILTERS,
        defaultSort: NAME_SORT,
        offered: datasets.offered,
      }),
      poolIo: tableOf({
        key: 'pool-io',
        labelKey: 'hosts.storage.tables.poolIo',
        rows: poolIoList,
        columns: POOL_IO_COLUMNS,
        matches: matchesPoolIo,
        filterGroups: POOL_IO_FILTERS,
        defaultSort: POOL_SORT,
        offered: poolIo.offered,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'hosts.storage.search',
  });

  const refresh = () => {
    onRefresh();
    refreshReadings(id);
    refreshSeries(id);
    bump();
  };

  const actions = (
    <StorageHeader query={query} onQuery={setQuery} series={poolIo.offered} onRefresh={refresh} />
  );

  return (
    <SectionPane
      section={section}
      server={server}
      count={pools.offered && pools.loaded ? poolList.length : null}
      actions={actions}
    >
      <StorageSummary
        pools={poolList.length}
        datasets={datasetList.length}
        disks={diskList.length}
        folds={folds}
      />
      {pools.offered ? (
        <PoolsTable
          table={search.tables.pools}
          reading={{ ...pools, rows: poolList }}
          filtering={search.filtering}
          fold={foldOf({ folds, key: 'pools', t })}
          ctx={ctx}
        />
      ) : null}
      {datasets.offered ? (
        <DatasetsTable
          table={search.tables.datasets}
          reading={{ ...datasets, rows: datasetList }}
          filtering={search.filtering}
          fold={foldOf({ folds, key: 'datasets', t })}
          ctx={ctx}
        />
      ) : null}
      {poolIo.offered ? (
        <PoolIOTable
          table={search.tables['pool-io']}
          reading={{ rows: poolIoList, loaded: poolIo.loaded, failed: poolIo.failed }}
          filtering={search.filtering}
          fold={foldOf({ folds, key: 'poolIo', t })}
          ctx={ctx}
        />
      ) : null}
      <StorageCharts
        diskIo={NO_SERIES}
        poolIo={{ ...poolIo, latest: poolIoList }}
        arc={NO_SERIES}
        host={host.label}
        folds={folds}
        charts={POOL_CHARTS}
      />
      <div data-panel="storage-management">
        <ZfsPoolsPanel
          id={id}
          turn={turn}
          disks={{ ...disks, rows: diskList }}
          tools={tools}
          view="pools"
        />
        <ZfsDatasetsPanel id={id} turn={turn} tools={tools} />
        {tools.task ? (
          <TaskDialog status={status} id={id} task={tools.task} onHide={tools.closeTask} />
        ) : null}
      </div>
    </SectionPane>
  );
};

PoolsPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  host: PropTypes.shape({ label: PropTypes.string.isRequired }).isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default PoolsPage;
