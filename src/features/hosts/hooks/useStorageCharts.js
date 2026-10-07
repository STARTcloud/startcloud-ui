import { useMemo, useState } from 'react';

import { chartOf } from '../charts/registry';
import { DEFAULT_STORAGE_CHART_SORT, sortedChartEntries } from '../utils/StorageUtils';

const DEVICES = chartOf('disk-io');

const POOLS = chartOf('pool');

/**
 * The state of the storage charts: the points per device of the disk I/O
 * samples and per pool of the pool I/O samples, grouped by the `series`
 * of the `disk-io` and `pool` entries of the registry, the order the
 * device charts draw in, the busiest first until a person picks another,
 * and the groups of lines shown, the entries' `groups` as the page opens,
 * each toggled by its button; the order and the groups are the page's
 * own and are kept while the page is drawn.
 *
 * @param {Object} rows - `diskIo` and `poolIo`, the samples held of each
 * @returns {Object} The entities, the device names in order, the order and its setter, the visibility and its toggle
 */
export const useStorageCharts = ({ diskIo, poolIo }) => {
  const [order, setOrder] = useState(DEFAULT_STORAGE_CHART_SORT);
  const [visibility, setVisibility] = useState(DEVICES.groups);
  const devices = useMemo(() => DEVICES.series(diskIo), [diskIo]);
  const pools = useMemo(() => POOLS.series(poolIo), [poolIo]);
  const names = useMemo(() => sortedChartEntries(devices, order), [devices, order]);
  const toggle = key => setVisibility(current => ({ ...current, [key]: !current[key] }));
  return { devices, pools, names, order, setOrder, visibility, toggle };
};
