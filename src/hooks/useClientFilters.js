import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toggleIn } from '../utils/prefs';

const NO_SPECS = [];

const emptySets = specs => Object.fromEntries(specs.map(spec => [spec.key, new Set()]));

const setOfValue = value => new Set(value ? value.split(',') : []);

const boundSets = (specs, applied) =>
  Object.fromEntries(specs.map(spec => [spec.key, setOfValue(applied[spec.key])]));

const passes = (row, spec, active) =>
  active.size === 0 || spec.values(row).some(value => active.has(value));

const countsOf = (spec, rows) => {
  const entries = Object.fromEntries((spec.order || []).map(value => [value, 0]));
  rows.forEach(row =>
    spec.values(row).forEach(value => {
      entries[value] = (entries[value] || 0) + 1;
    })
  );
  return entries;
};

const nextActive = (spec, current, value) => {
  if (spec.kind === 'select') {
    return current.has(value) ? new Set() : new Set([value]);
  }
  return toggleIn(current, value);
};

/**
 * The rows left by every group's active set: a row passes a group when
 * the group has no active value or one of the row's values is active.
 *
 * @param {Array} rows - The rows to narrow
 * @param {Array} specs - The group specs, each with `key` and `values(row)`
 * @param {Object} sets - The active set per group key
 * @returns {Array} The rows left
 */
export const narrowRows = (rows, specs, sets) =>
  rows.filter(row => specs.every(spec => passes(row, spec, sets[spec.key])));

/**
 * One navbar panel group from a spec: the pills are the spec's `order`
 * followed by every value the rows carry, each counted over the rows.
 *
 * @param {Object} options
 * @param {Object} options.spec - `{ key, labelKey, values, kind?, order?, activeClass, labelFor }`
 * @param {Array} options.rows - The rows the counts are drawn from
 * @param {Set} options.active - The group's active values
 * @param {Function} options.onToggle - `onToggle(next)` with the next active set
 * @param {Function} options.t - The translator
 * @param {string} [options.label] - The label drawn instead of the spec's key
 * @returns {Object} The panel group
 */
export const filterGroupOf = ({ spec, rows, active, onToggle, t, label }) => ({
  kind: spec.kind || 'toggle',
  key: spec.key,
  label: label || t(spec.labelKey),
  entries: countsOf(spec, rows),
  activeSet: active,
  activeClass: spec.activeClass,
  labelFor: value => spec.labelFor(value, t),
  onToggle: value => onToggle(nextActive(spec, active, value)),
});

/**
 * Holds one active set per client-side filter group and narrows the rows
 * by them: a `toggle` group keeps the rows carrying any active value, a
 * `select` group keeps one value at a time. Answers the rows left, the
 * panel groups in the specs' order with their counts over the rows handed
 * in, whether any value is active, and a clear that empties every set.
 * With `bound`, a `useUrlNarrowing` result whose filter keys include
 * every spec's key, the sets live in the URL instead, one key per group
 * with the active values comma-joined, read on load and written on every
 * change, and clear empties every key the URL holds.
 *
 * @param {Object} options
 * @param {Array} [options.specs] - `{ key, labelKey, values(row), kind?, order?, activeClass, labelFor(value, t) }` per group
 * @param {Array} options.rows - The rows to narrow
 * @param {{ applied: Object, setFilter: Function, clearFilters: Function }|null} [options.bound] - The URL narrowing holding the sets
 * @returns {{ rows: Array, groups: Array, active: boolean, clear: Function }} The narrowing
 */
export const useClientFilters = ({ specs = NO_SPECS, rows, bound = null }) => {
  const { t } = useTranslation();
  const [ownSets, setOwnSets] = useState(() => emptySets(specs));
  const sets = bound ? boundSets(specs, bound.applied) : ownSets;
  const groups = specs.map(spec =>
    filterGroupOf({
      spec,
      rows,
      active: sets[spec.key],
      onToggle: next =>
        bound
          ? bound.setFilter(spec.key, [...next].join(','))
          : setOwnSets(current => ({ ...current, [spec.key]: next })),
      t,
    })
  );
  return {
    rows: narrowRows(rows, specs, sets),
    groups,
    active: specs.some(spec => sets[spec.key].size > 0),
    clear: () => (bound ? bound.clearFilters() : setOwnSets(emptySets(specs))),
  };
};
