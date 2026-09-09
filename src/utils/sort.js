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
 * Sorts items by every entry of the sort stack in order, each entry naming
 * a column among the given ones that carries a `sortValue`; an entry whose
 * column is absent is skipped, so a sort on a hidden column is dropped. A
 * `sortValue` may return an array, compared element by element. Returns
 * the items untouched when no entry applies.
 *
 * @param {Array} items - The items to sort
 * @param {Array<{ column: string, direction: string }>} stack - The active sort, first entry first
 * @param {Array} columns - The columns a sort may target
 * @returns {Array} The sorted items
 */
export const sortItems = (items, stack, columns) => {
  const entries = stack
    .map(entry => ({
      column: columns.find(column => column.key === entry.column),
      direction: entry.direction === 'desc' ? -1 : 1,
    }))
    .filter(entry => entry.column && entry.column.sortValue);
  if (entries.length === 0) {
    return items;
  }
  return [...items].sort((a, b) => {
    for (const { column, direction } of entries) {
      const result = direction * compare(column.sortValue(a), column.sortValue(b));
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  });
};

const advance = (stack, index) => {
  const entry = stack[index];
  if (entry.direction === 'asc') {
    return stack.map((other, at) => (at === index ? { ...other, direction: 'desc' } : other));
  }
  return [...stack.slice(0, index), ...stack.slice(index + 1)];
};

/**
 * The sort stack after one click on `column`: a plain click sorts by that
 * column alone, ascending on a new column, then descending, then off; an
 * appending click (Shift) adds the column as the next entry, or advances
 * the entry it already has the same way.
 *
 * @param {Array<{ column: string, direction: string }>} stack - The active sort
 * @param {string} column - The clicked column key
 * @param {Object} [options] - The click
 * @param {boolean} [options.append] - Whether the click adds to the stack
 * @returns {Array<{ column: string, direction: string }>} The next sort
 */
export const nextSort = (stack, column, { append = false } = {}) => {
  const index = stack.findIndex(entry => entry.column === column);
  if (append) {
    return index === -1 ? [...stack, { column, direction: 'asc' }] : advance(stack, index);
  }
  if (stack.length === 1 && index === 0) {
    return advance(stack, 0);
  }
  return [{ column, direction: 'asc' }];
};
