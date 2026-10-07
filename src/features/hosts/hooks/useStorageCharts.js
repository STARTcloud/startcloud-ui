import { useMemo, useState } from 'react';

import { chartOf } from '../charts/registry';
import { DEFAULT_STORAGE_CHART_SORT, sortedChartEntries } from '../utils/StorageUtils';

const DEVICES = chartOf('disk-io');

/**
 * The state of the storage charts over the points per device and per
 * pool the page computes once for its tables and its charts: the device
 * names in the order the device charts draw, the busiest first until a
 * person picks another, and the pills pressed, the `disk-io` entry's
 * `groups` as the page opens, one set for every device and pool chart,
 * each toggled by its pill; the order and the pills are the page's own
 * and are kept while the page is drawn.
 *
 * @param {Object} entities - `devices` and `pools`, the points per entity of the `disk-io` and `pool` entries' `series`
 * @returns {Object} The entities, the device names in order, the order and its setter, the visibility and its toggle
 */
export const useStorageCharts = ({ devices, pools }) => {
  const [order, setOrder] = useState(DEFAULT_STORAGE_CHART_SORT);
  const [visibility, setVisibility] = useState(DEVICES.groups);
  const names = useMemo(() => sortedChartEntries(devices, order), [devices, order]);
  const toggle = key => setVisibility(current => ({ ...current, [key]: current[key] === false }));
  return { devices, pools, names, order, setOrder, visibility, toggle };
};
