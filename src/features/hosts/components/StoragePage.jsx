import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import NotAvailableStub from '../../../components/common/NotAvailableStub';
import PageHeader from '../../../components/common/PageHeader';
import { useStatus } from '../../../contexts/StatusContext';
import { useFolds } from '../../../hooks/useFolds';
import { pageContextShape } from '../../../utils/itemShape';
import { useHostReadingsRefresh } from '../hooks/useHostReadings';
import { useHostRow } from '../hooks/useHostRow';
import { useHostSeriesQuery, useHostSeriesRefresh } from '../hooks/useHostSeries';
import { useHostStats } from '../hooks/useHostStats';
import { useHostStorageData } from '../hooks/useHostStorageData';
import { useHostStorageSearch } from '../hooks/useHostStorageSearch';
import { useServers } from '../hooks/useServers';
import { useZfsTools } from '../hooks/useZfsTools';
import { hostLabel, isServerRole } from '../utils/hosts';
import {
  DATASET_FILTERS,
  DISK_FILTERS,
  DISK_IO_FILTERS,
  POOL_FILTERS,
  POOL_IO_FILTERS,
  hostHasStorage,
  matchesDataset,
  matchesDisk,
  matchesDiskIo,
  matchesPool,
  matchesPoolIo,
} from '../utils/StorageUtils';

import ArcStats from './ArcStats';
import DatasetsTable, { DATASET_COLUMNS } from './DatasetsTable';
import DiskIOTable, { DISK_IO_COLUMNS } from './DiskIOTable';
import DisksTable, { DISK_COLUMNS } from './DisksTable';
import HostTabs from './HostTabs';
import PoolIOTable, { POOL_IO_COLUMNS } from './PoolIOTable';
import PoolsTable, { POOL_COLUMNS } from './PoolsTable';
import RefreshButton from './RefreshButton';
import StorageCharts from './StorageCharts';
import StorageHeader from './StorageHeader';
import StorageManagement from './StorageManagement';
import StorageSummary from './StorageSummary';

const POOL_SORT = [{ column: 'pool', direction: 'asc' }];
const NAME_SORT = [{ column: 'name', direction: 'asc' }];
const DEVICE_SORT = [{ column: 'device', direction: 'asc' }];
const TOTAL_SORT = [{ column: 'total', direction: 'desc' }];

const FOLD_TITLES = {
  pools: ['host.poolsTable.expandSection', 'host.poolsTable.collapseSection'],
  datasets: ['host.datasetsTable.expand', 'host.datasetsTable.collapse'],
  disks: ['host.disksTable.expand', 'host.disksTable.collapse'],
  diskIo: ['host.diskIOTable.expand', 'host.diskIOTable.collapse'],
  poolIo: ['host.poolIOTable.expandSection', 'host.poolIOTable.collapseSection'],
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

const tableOf = ({ key, labelKey, reading, columns, matches, filterGroups, defaultSort }) => ({
  key,
  labelKey,
  rows: reading.rows,
  columns,
  matches,
  filterGroups,
  defaultSort,
  offered: reading.offered,
});

/**
 * The storage page of a host that offers it, the frame and the surfaces
 * in hyperweaver-ui's order: the heading with the time window, the
 * resolution and Refresh, the tab row of the host's pages, the storage
 * summary, the pools, the datasets, the disks, the disk I/O and the
 * pool I/O tables, each the one `SubTable` narrowed by the page's one
 * search binding under a heading that folds, the ARC statistics, the
 * storage charts and the ZFS management. Every read is the copy the
 * hosts feature's context holds and every fold is kept under the page's
 * `table_prefs_storage`.
 */
const StorageFrame = ({ id, server, context }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const { refresh: refreshServers } = useServers();
  const { stats, refresh: refreshStats } = useHostStats(id);
  const refreshReadings = useHostReadingsRefresh();
  const refreshSeries = useHostSeriesRefresh();
  const { query, setQuery } = useHostSeriesQuery(id);
  const folds = useFolds(`${context.prefsPrefix}_storage`);
  const data = useHostStorageData(id);
  const [turn, setTurn] = useState(0);
  const bump = useCallback(() => setTurn(current => current + 1), []);
  const tools = useZfsTools({ id, onSettled: bump });
  const ctx = { ...context, t, language: i18n.language };
  const search = useHostStorageSearch({
    tables: {
      pools: tableOf({
        key: 'pools',
        labelKey: 'host.storageSummary.totalPools',
        reading: data.pools,
        columns: POOL_COLUMNS,
        matches: matchesPool,
        filterGroups: POOL_FILTERS,
        defaultSort: POOL_SORT,
      }),
      datasets: tableOf({
        key: 'datasets',
        labelKey: 'host.storageSummary.totalDatasets',
        reading: data.datasets,
        columns: DATASET_COLUMNS,
        matches: matchesDataset,
        filterGroups: DATASET_FILTERS,
        defaultSort: NAME_SORT,
      }),
      disks: tableOf({
        key: 'disks',
        labelKey: 'host.storageSummary.physicalDisks',
        reading: data.disks,
        columns: DISK_COLUMNS,
        matches: matchesDisk,
        filterGroups: DISK_FILTERS,
        defaultSort: DEVICE_SORT,
      }),
      diskIo: tableOf({
        key: 'disk-io',
        labelKey: 'hosts.storage.tables.diskIo',
        reading: { rows: data.diskIo.latest, offered: data.diskIo.offered },
        columns: DISK_IO_COLUMNS,
        matches: matchesDiskIo,
        filterGroups: DISK_IO_FILTERS,
        defaultSort: TOTAL_SORT,
      }),
      poolIo: tableOf({
        key: 'pool-io',
        labelKey: 'hosts.storage.tables.poolIo',
        reading: { rows: data.poolIo.latest, offered: data.poolIo.offered },
        columns: POOL_IO_COLUMNS,
        matches: matchesPoolIo,
        filterGroups: POOL_IO_FILTERS,
        defaultSort: POOL_SORT,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
  });
  const label = labelOf({ status, server, id, stats });
  const title = t('host.storageHeader.title');

  useEffect(() => {
    document.title = `${title} · ${label}`;
  }, [title, label]);

  const refresh = () => {
    refreshServers();
    refreshStats();
    refreshReadings(id);
    refreshSeries(id);
    bump();
  };

  const series = data.diskIo.offered || data.poolIo.offered || data.arc.offered;
  const diskIoReading = {
    rows: data.diskIo.latest,
    loaded: data.diskIo.loaded,
    failed: data.diskIo.failed,
  };
  const poolIoReading = {
    rows: data.poolIo.latest,
    loaded: data.poolIo.loaded,
    failed: data.poolIo.failed,
  };

  return (
    <div className="list row" data-page="storage">
      <PageHeader
        title={title}
        subtitle={label}
        actions={
          <StorageHeader query={query} onQuery={setQuery} series={series} onRefresh={refresh} />
        }
      />
      <HostTabs id={id} />
      <StorageSummary
        pools={data.pools.rows.length}
        datasets={data.datasets.rows.length}
        disks={data.disks.rows.length}
        folds={folds}
      />
      {data.pools.offered ? (
        <PoolsTable
          table={search.pools}
          reading={data.pools}
          filtering={search.filtering}
          fold={foldOf({ folds, key: 'pools', t })}
          ctx={ctx}
        />
      ) : null}
      {data.datasets.offered ? (
        <DatasetsTable
          table={search.datasets}
          reading={data.datasets}
          filtering={search.filtering}
          fold={foldOf({ folds, key: 'datasets', t })}
          ctx={ctx}
        />
      ) : null}
      {data.disks.offered ? (
        <DisksTable
          table={search.disks}
          reading={data.disks}
          filtering={search.filtering}
          fold={foldOf({ folds, key: 'disks', t })}
          ctx={ctx}
        />
      ) : null}
      {data.diskIo.offered ? (
        <DiskIOTable
          table={search.diskIo}
          reading={diskIoReading}
          filtering={search.filtering}
          fold={foldOf({ folds, key: 'diskIo', t })}
          ctx={ctx}
        />
      ) : null}
      {data.poolIo.offered ? (
        <PoolIOTable
          table={search.poolIo}
          reading={poolIoReading}
          filtering={search.filtering}
          fold={foldOf({ folds, key: 'poolIo', t })}
          ctx={ctx}
        />
      ) : null}
      {data.arc.offered ? <ArcStats arc={data.arc.newest} folds={folds} /> : null}
      <StorageCharts
        diskIo={data.diskIo}
        poolIo={data.poolIo}
        arc={data.arc}
        host={label}
        folds={folds}
      />
      <StorageManagement id={id} turn={turn} disks={data.disks} tools={tools} />
    </div>
  );
};

StorageFrame.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
};

/**
 * What the storage route draws for a host the list of servers does not
 * hold, what the host page draws for such an id: the heading with the
 * id or the hostname the stats answered, and the danger alert when the
 * host's stats failed, the loading line until they answered.
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
    <div className="list row" data-page="storage-unknown">
      <PageHeader
        title={t('host.storageHeader.title')}
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
 * The storage of one host at `/hosts/{id}/storage`, hyperweaver-ui's
 * host storage page and its ZFS management together, behind `zfs`,
 * hyperweaver-ui's gate of its Storage tab checked strictly on the
 * host's own row: a host that lists it not draws the not-available stub
 * and nothing is asked of it, and an id the list of servers does not
 * hold draws what the host page draws for it. The monitoring surfaces,
 * the tables, the ARC statistics and the charts, are behind the tokens
 * their reads name, `monitoring` and `zfs`, so a host that lists `zfs`
 * and no `monitoring` draws the frame and the ZFS management alone.
 */
const StoragePage = ({ id, context }) => {
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

  if (!hostHasStorage(server)) {
    return <NotAvailableStub title={t('host.storageHeader.title')} tokenLabel="zfs" />;
  }

  return <StorageFrame id={id} server={server} context={context} />;
};

StoragePage.propTypes = {
  id: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
};

export default StoragePage;
