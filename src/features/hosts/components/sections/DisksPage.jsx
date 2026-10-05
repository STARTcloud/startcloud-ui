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
  DISK_FILTERS,
  DISK_IO_FILTERS,
  diskIoRows,
  diskRows,
  hostHasStorage,
  matchesDisk,
  matchesDiskIo,
} from '../../utils/StorageUtils';
import DiskIOTable, { DISK_IO_COLUMNS } from '../DiskIOTable';
import DisksTable, { DISK_COLUMNS } from '../DisksTable';
import SectionPane from '../SectionPane';
import StorageCharts from '../StorageCharts';
import StorageHeader from '../StorageHeader';
import TaskDialog from '../TaskDialog';
import ZfsPoolsPanel from '../ZfsPoolsPanel';

const DEVICE_SORT = [{ column: 'device', direction: 'asc' }];

const TOTAL_SORT = [{ column: 'total', direction: 'desc' }];

const NO_ROWS = [];

const NO_SERIES = { rows: NO_ROWS, loaded: true, failed: false, offered: false, latest: NO_ROWS };

const DISK_CHARTS = ['summary', 'devices'];

const FOLD_TITLES = {
  disks: ['host.disksTable.expand', 'host.disksTable.collapse'],
  diskIo: ['host.diskIOTable.expand', 'host.diskIOTable.collapse'],
};

const foldOf = ({ folds, key, t }) => {
  const folded = folds.folded(key);
  const [expand, collapse] = FOLD_TITLES[key];
  return { folded, onFold: () => folds.toggle(key), title: t(folded ? expand : collapse) };
};

/**
 * The Disks page of a host: the heading counting the disks, the time
 * window and Refresh in its pane, and under it the disks and disk I/O
 * tables, each one table narrowed by the page's search
 * under a folding heading, the summary and device charts, and on a host
 * that lists `zfs` the ZFS pool manager's chassis with Rescan and each
 * pool member's disk dialog, every write a queued task through
 * `useZfsTools`; the folds kept under `table_prefs_disks`.
 */
const DisksPage = ({ id, server, context, section, host, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const refreshReadings = useHostReadingsRefresh();
  const refreshSeries = useHostSeriesRefresh();
  const { query, setQuery } = useHostSeriesQuery(id);
  const folds = useFolds(`${context.prefsPrefix}_${section}`);
  const disks = useHostReading(id, 'disks');
  const diskIo = useHostSeries(id, 'disk-io');
  const [turn, setTurn] = useState(0);
  const bump = useCallback(() => setTurn(current => current + 1), []);
  const tools = useZfsTools({ id, onSettled: bump });
  const diskList = useMemo(() => diskRows(disks.data), [disks.data]);
  const diskIoList = useMemo(() => diskIoRows(diskIo.rows), [diskIo.rows]);
  const ctx = { ...context, t, language: i18n.language };
  const search = useHostManageSearch({
    section,
    tables: {
      disks: tableOf({
        key: 'disks',
        labelKey: 'host.storageSummary.physicalDisks',
        rows: diskList,
        columns: DISK_COLUMNS,
        matches: matchesDisk,
        filterGroups: DISK_FILTERS,
        defaultSort: DEVICE_SORT,
        offered: disks.offered,
      }),
      diskIo: tableOf({
        key: 'disk-io',
        labelKey: 'hosts.storage.tables.diskIo',
        rows: diskIoList,
        columns: DISK_IO_COLUMNS,
        matches: matchesDiskIo,
        filterGroups: DISK_IO_FILTERS,
        defaultSort: TOTAL_SORT,
        offered: diskIo.offered,
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
    <StorageHeader query={query} onQuery={setQuery} series={diskIo.offered} onRefresh={refresh} />
  );

  return (
    <SectionPane
      section={section}
      server={server}
      count={disks.offered && disks.loaded ? diskList.length : null}
      actions={actions}
    >
      {disks.offered ? (
        <DisksTable
          table={search.tables.disks}
          reading={{ ...disks, rows: diskList }}
          filtering={search.filtering}
          fold={foldOf({ folds, key: 'disks', t })}
          ctx={ctx}
        />
      ) : null}
      {diskIo.offered ? (
        <DiskIOTable
          table={search.tables['disk-io']}
          reading={{ rows: diskIoList, loaded: diskIo.loaded, failed: diskIo.failed }}
          filtering={search.filtering}
          fold={foldOf({ folds, key: 'diskIo', t })}
          ctx={ctx}
        />
      ) : null}
      <StorageCharts
        diskIo={diskIo}
        poolIo={NO_SERIES}
        arc={NO_SERIES}
        host={host.label}
        folds={folds}
        charts={DISK_CHARTS}
      />
      {hostHasStorage(server) ? (
        <div data-panel="storage-management">
          <ZfsPoolsPanel
            id={id}
            turn={turn}
            disks={{ ...disks, rows: diskList }}
            tools={tools}
            view="disks"
          />
          {tools.task ? (
            <TaskDialog status={status} id={id} task={tools.task} onHide={tools.closeTask} />
          ) : null}
        </div>
      ) : null}
    </SectionPane>
  );
};

DisksPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  host: PropTypes.shape({ label: PropTypes.string.isRequired }).isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default DisksPage;
