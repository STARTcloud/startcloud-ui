import { useEffect, useState } from 'react';

import { readDetailPrefs, withWidth, writeDetailPrefs } from '../utils/prefs';
import { nextSort } from '../utils/sort';

/**
 * The table preferences of a page's table that has no navbar binding of
 * its own: the sort stack with its setter, the hidden column keys and the
 * column widths with their setter, kept as the one `table_prefs_*` object
 * under `prefsKey` the way `useDetailSearch` keeps them.
 *
 * @param {string} prefsKey - The localStorage key of the table's prefs
 * @param {Array} columns - The table's columns, `defaultHidden` ones hidden until saved
 * @returns {{ sort: Array, setSort: Function, hiddenColumns: Set, widths: Object, setColumnWidth: Function }} The preferences
 */
export const useTablePrefs = (prefsKey, columns) => {
  const [prefs, setPrefs] = useState(() => readDetailPrefs(prefsKey, columns));

  useEffect(() => {
    writeDetailPrefs(prefsKey, prefs);
  }, [prefsKey, prefs]);

  const setSort = (column, options) =>
    setPrefs(current => ({ ...current, sort: nextSort(current.sort, column, options) }));

  const setColumnWidth = (column, pixels) =>
    setPrefs(current => ({ ...current, widths: withWidth(current.widths, column, pixels) }));

  return {
    sort: prefs.sort,
    setSort,
    hiddenColumns: prefs.hiddenColumns,
    widths: prefs.widths,
    setColumnWidth,
  };
};
