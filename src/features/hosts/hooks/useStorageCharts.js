import { useMemo, useState } from 'react';

import { poolSeries } from '../utils/series';
import { DEFAULT_STORAGE_CHART_SORT, ioSeries, sortedChartEntries } from '../utils/StorageUtils';

const ALL_SHOWN = { read: true, write: true, total: true };

/**
 * The state of the storage charts, hyperweaver-ui's: the points per
 * device of the disk I/O samples and per pool of the pool I/O samples,
 * the order the device charts draw in, the busiest first until a person
 * picks another, and the groups of lines shown, the read, the write and
 * the total, each toggled by its button; the order and the groups are
 * the page's own and are kept while the page is drawn.
 *
 * @param {Object} rows - `diskIo` and `poolIo`, the samples held of each
 * @returns {Object} The entities, the device names in order, the order and its setter, the visibility and its toggle
 */
export const useStorageCharts = ({ diskIo, poolIo }) => {
  const [order, setOrder] = useState(DEFAULT_STORAGE_CHART_SORT);
  const [visibility, setVisibility] = useState(ALL_SHOWN);
  const devices = useMemo(() => ioSeries(diskIo, row => row.device_name), [diskIo]);
  const pools = useMemo(() => poolSeries(poolIo), [poolIo]);
  const names = useMemo(() => sortedChartEntries(devices, order), [devices, order]);
  const toggle = key => setVisibility(current => ({ ...current, [key]: !current[key] }));
  return { devices, pools, names, order, setOrder, visibility, toggle };
};
