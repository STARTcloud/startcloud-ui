const compare = (left, right) => {
  if (Array.isArray(left) && Array.isArray(right)) {
    for (let index = 0; index < left.length; index += 1) {
      const result = compare(left[index], right[index]);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  }
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
};

/**
 * Sorts items by the column named in `sort` when that column is among the
 * given ones and carries a `sortValue`; a `sortValue` may return an array,
 * compared element by element. Returns the items untouched otherwise.
 *
 * @param {Array} items - The items to sort
 * @param {{ column: string, direction: string }} sort - The active sort
 * @param {Array} columns - The columns a sort may target
 * @returns {Array} The sorted items
 */
export const sortItems = (items, sort, columns) => {
  const column = columns.find(entry => entry.key === sort.column);
  if (!column || !column.sortValue) {
    return items;
  }
  const direction = sort.direction === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => direction * compare(column.sortValue(a), column.sortValue(b)));
};

/**
 * The sort after one click on `column`: ascending on a new column, then
 * descending, then off.
 *
 * @param {{ column: string, direction: string }} current - The active sort
 * @param {string} column - The clicked column key
 * @returns {{ column: string, direction: string }} The next sort
 */
export const nextSort = (current, column) => {
  if (current.column !== column) {
    return { column, direction: 'asc' };
  }
  if (current.direction === 'asc') {
    return { column, direction: 'desc' };
  }
  return { column: '', direction: 'asc' };
};
