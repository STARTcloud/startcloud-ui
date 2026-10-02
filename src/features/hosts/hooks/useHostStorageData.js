import { useMemo } from 'react';

import { latestOf } from '../utils/series';
import { datasetRows, diskIoRows, diskRows, poolIoRows, poolRows } from '../utils/StorageUtils';

import { useHostReading } from './useHostReadings';
import { useHostSeries } from './useHostSeries';

/**
 * What the storage page draws of one host, every read the copy the hosts
 * feature's context holds, never a second request: the pools, the
 * datasets and the disks of `useHostReading`, each answer's rows drawn
 * once, the newest of each where the agent keeps a history; the disk
 * I/O, the pool I/O and the ARC of `useHostSeries`, the newest sample of
 * each device and each pool as the tables' rows and every sample as the
 * charts', the ARC's newest sample as the ARC statistics. hyperweaver-ui
 * read each on its own timer; here each is read once, grows by the
 * `monitoring` topic's push and is read again on Refresh.
 *
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Object} `pools`, `datasets`, `disks`, `diskIo`, `poolIo` and `arc`, each the read and its `rows`
 */
export const useHostStorageData = id => {
  const pools = useHostReading(id, 'pools');
  const datasets = useHostReading(id, 'datasets');
  const disks = useHostReading(id, 'disks');
  const diskIo = useHostSeries(id, 'disk-io');
  const poolIo = useHostSeries(id, 'pool-io');
  const arc = useHostSeries(id, 'arc');
  const poolList = useMemo(() => poolRows(pools.data), [pools.data]);
  const datasetList = useMemo(() => datasetRows(datasets.data), [datasets.data]);
  const diskList = useMemo(() => diskRows(disks.data), [disks.data]);
  const diskIoList = useMemo(() => diskIoRows(diskIo.rows), [diskIo.rows]);
  const poolIoList = useMemo(() => poolIoRows(poolIo.rows), [poolIo.rows]);
  const newestArc = useMemo(() => latestOf(arc.rows), [arc.rows]);
  return {
    pools: { ...pools, rows: poolList },
    datasets: { ...datasets, rows: datasetList },
    disks: { ...disks, rows: diskList },
    diskIo: { ...diskIo, latest: diskIoList },
    poolIo: { ...poolIo, latest: poolIoList },
    arc: { ...arc, newest: newestArc },
  };
};
