const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

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
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  return collator.compare(String(left ?? ''), String(right ?? ''));
};

/**
 * Sorts items by every entry of the sort stack in order, each entry naming
 * a column among the given ones, by what that column's `value(row, ctx)`
 * answers: two numbers by number, anything else as text through one
 * collator that orders naturally (9.0.1 before 12.0.4) and ignores case,
 * an array element by element. An entry whose column is absent is
 * skipped, so a sort on a hidden column is dropped. Returns the items
 * untouched when no entry applies.
 *
 * @param {Array} items - The items to sort
 * @param {Array<{ column: string, direction: string }>} stack - The active sort, first entry first
 * @param {Array} columns - The columns a sort may target, each with `key` and `value`
 * @param {Object} ctx - The context every `value` receives
 * @returns {Array} The sorted items
 */
export const sortItems = (items, stack, columns, ctx) => {
  const entries = stack
    .map(entry => ({
      column: columns.find(column => column.key === entry.column),
      direction: entry.direction === 'desc' ? -1 : 1,
    }))
    .filter(entry => entry.column);
  if (entries.length === 0) {
    return items;
  }
  return [...items].sort((a, b) => {
    for (const { column, direction } of entries) {
      const result = direction * compare(column.value(a, ctx), column.value(b, ctx));
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
