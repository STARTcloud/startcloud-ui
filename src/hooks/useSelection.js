import { useState } from 'react';

const withToggled = (current, key) => {
  const next = new Set(current);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  return next;
};

/**
 * The picked rows of one table or card grid: the set of picked keys, the
 * per-row and select-all toggles, whether the page is fully or partly
 * picked, a clear, and the `selection` prop `SubTable`, `ItemsTable` and
 * `ItemCards` draw their checkbox column or card checkbox from.
 *
 * @param {Array} rows - The rows the page shows right now
 * @param {Object} [options] - How a row is keyed and labelled
 * @param {Function} [options.keyOf] - The key of one row, `row.id` by default
 * @param {Function} [options.labelOf] - The checkbox's accessible label for one row
 * @returns {{selected: Set, toggle: Function, toggleAll: Function, allSelected: boolean, someSelected: boolean, clear: Function, subtable: Object}} The picked state
 */
export const useSelection = (rows, { keyOf = row => row.id, labelOf = null } = {}) => {
  const [selected, setSelected] = useState(() => new Set());
  const toggle = key => setSelected(current => withToggled(current, key));
  const allSelected = rows.length > 0 && rows.every(row => selected.has(keyOf(row)));
  const someSelected = selected.size > 0;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map(keyOf)));
  const clear = () => setSelected(new Set());
  return {
    selected,
    toggle,
    toggleAll,
    allSelected,
    someSelected,
    clear,
    subtable: {
      allSelected,
      someSelected,
      onToggleAll: toggleAll,
      isSelected: row => selected.has(keyOf(row)),
      onToggleRow: row => toggle(keyOf(row)),
      labelOf: labelOf || undefined,
    },
  };
};
