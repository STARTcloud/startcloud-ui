import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toggleIn } from '../utils/prefs';

const NO_SPECS = [];

const START_LABEL_KEY = 'admin.activity.startDate';
const END_LABEL_KEY = 'admin.activity.endDate';

const isRange = spec => spec.kind === 'date-range';

const emptyRange = () => ({ start: '', end: '' });

const emptyActive = spec => (isRange(spec) ? emptyRange() : new Set());

const emptySets = specs => Object.fromEntries(specs.map(spec => [spec.key, emptyActive(spec)]));

const setOfValue = value => new Set(value ? value.split(',') : []);

const rangeOfValue = value => {
  const [start = '', end = ''] = value ? value.split(',') : [];
  return { start, end };
};

const valueOfRange = range => (range.start || range.end ? `${range.start},${range.end}` : '');

const boundSets = (specs, applied) =>
  Object.fromEntries(
    specs.map(spec => [
      spec.key,
      isRange(spec) ? rangeOfValue(applied[spec.key]) : setOfValue(applied[spec.key]),
    ])
  );

const rangeActive = range => Boolean(range.start || range.end);

const pad = value => String(value).padStart(2, '0');

/**
 * A value's calendar day as an ISO date, the form a date-range group
 * compares; empty for a value that is not a date.
 *
 * @param {*} value - A date, an ISO string or epoch milliseconds
 * @returns {string} `YYYY-MM-DD`, or empty
 */
export const dayOf = value => {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const inRange = (day, range) =>
  day !== '' && (!range.start || day >= range.start) && (!range.end || day <= range.end);

const passes = (row, spec, active) => {
  if (isRange(spec)) {
    return !rangeActive(active) || spec.values(row).some(day => inRange(day, active));
  }
  return active.size === 0 || spec.values(row).some(value => active.has(value));
};

const isActive = (spec, active) => (isRange(spec) ? rangeActive(active) : active.size > 0);

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
 * The rows every group's active set leaves.
 *
 * @param {Array} rows - The rows to narrow
 * @param {Array} specs - The group specs, each with `key` and `values(row)`
 * @param {Object} sets - The active set per group key
 * @returns {Array} The rows left
 */
export const narrowRows = (rows, specs, sets) =>
  rows.filter(row => specs.every(spec => passes(row, spec, sets[spec.key])));

/**
 * One panel group from a spec, its pills counted over the rows; a
 * `date-range` spec is the shared date range over its values' days, the
 * next range handed to `onToggle` whole.
 *
 * @param {Object} options
 * @param {Object} options.spec - `{ key, labelKey, values, kind?, order?, activeClass, labelFor }`, `values(row)` answering ISO days for a `date-range` spec
 * @param {Array} options.rows - The rows the counts are drawn from
 * @param {Set|{ start: string, end: string }} options.active - The group's active values, or its range
 * @param {Function} options.onToggle - Called with the next active set, or the next range
 * @param {Function} options.t - The translator
 * @param {string} [options.label] - The label drawn in place of the spec's
 * @returns {Object} The panel group
 */
export const filterGroupOf = ({ spec, rows, active, onToggle, t, label }) => {
  if (isRange(spec)) {
    return {
      kind: 'date-range',
      key: spec.key,
      label: label || t(spec.labelKey),
      value: active,
      onChange: onToggle,
      startLabel: t(START_LABEL_KEY),
      endLabel: t(END_LABEL_KEY),
    };
  }
  return {
    kind: spec.kind || 'toggle',
    key: spec.key,
    label: label || t(spec.labelKey),
    entries: countsOf(spec, rows),
    activeSet: active,
    activeClass: spec.activeClass,
    labelFor: value => spec.labelFor(value, t),
    onToggle: value => onToggle(nextActive(spec, active, value)),
  };
};

/**
 * The Columns panel group of one table: one pill per drawn column, active
 * while shown; not a filter.
 *
 * @param {Object} options
 * @param {string} [options.key] - The group's key
 * @param {string} [options.label] - The group's label
 * @param {Array} options.columns - The columns the table draws
 * @param {Set} options.hidden - The hidden column keys
 * @param {Function} options.onToggle - Called with the column key a click flips
 * @param {Function} options.t - The translator
 * @returns {Object} The panel group
 */
export const columnsGroup = ({ key = 'columns', label = '', columns, hidden, onToggle, t }) => ({
  key,
  label: label || t('pages.filter.columns'),
  entries: Object.fromEntries(columns.map(column => [column.key, null])),
  activeSet: new Set(columns.map(column => column.key).filter(column => !hidden.has(column))),
  activeClass: 'bg-secondary',
  columns: true,
  labelFor: column => t(columns.find(entry => entry.key === column).labelKey),
  onToggle,
});

/**
 * The column toggle of a table whose preferences hold one `hiddenColumns` set.
 *
 * @param {Function} setPrefs - The writer of the table's preferences
 * @returns {Function} Called with the column key to show or hide
 */
export const hiddenToggle = setPrefs => column =>
  setPrefs(current => ({ ...current, hiddenColumns: toggleIn(current.hiddenColumns, column) }));

/**
 * A `select` panel group over a request filter that picks one value.
 *
 * @param {Object} options
 * @param {string} options.key - The group's key
 * @param {string} options.label - The group's label
 * @param {Array<string|number>} options.values - The values offered
 * @param {string|number} options.value - The chosen value, empty for none
 * @param {Function} options.onChange - Called with the next value, empty for none
 * @param {Function} [options.labelFor] - The label of one value
 * @returns {Object} The panel group
 */
export const selectGroup = ({ key, label, values, value, onChange, labelFor = null }) => ({
  kind: 'select',
  key,
  label,
  entries: Object.fromEntries(values.map(entry => [String(entry), null])),
  activeSet: new Set(value === '' ? [] : [String(value)]),
  activeClass: 'bg-primary',
  labelFor: entry => (labelFor ? labelFor(entry) : entry),
  onToggle: entry => onChange(String(entry) === String(value) ? '' : entry),
});

/**
 * A one-pill `toggle` panel group over a request switch.
 *
 * @param {Object} options
 * @param {string} options.key - The group's key
 * @param {string} options.label - The group's label
 * @param {string} options.pill - The pill's label
 * @param {boolean} options.on - Whether the switch is on
 * @param {Function} options.onChange - Called with the next state
 * @returns {Object} The panel group
 */
export const switchGroup = ({ key, label, pill, on, onChange }) => ({
  kind: 'toggle',
  key,
  label,
  entries: { on: null },
  activeSet: new Set(on ? ['on'] : []),
  activeClass: 'bg-info',
  labelFor: () => pill,
  onToggle: () => onChange(!on),
});

const urlValueOf = (spec, next) => (isRange(spec) ? valueOfRange(next) : [...next].join(','));

/**
 * Holds one active set, or one date range for a `date-range` spec, per
 * client-side filter group, in state or, with `bound`, in the URL, and
 * narrows the rows by them.
 *
 * @param {Object} options
 * @param {Array} [options.specs] - `{ key, labelKey, values(row), kind?, order?, activeClass, labelFor(value, t) }` per group, a `date-range` spec's `values(row)` answering ISO days
 * @param {Array} options.rows - The rows to narrow
 * @param {{ applied: Object, setFilter: Function, clearFilters: Function }|null} [options.bound] - The `useUrlNarrowing` result holding the sets, a range as `start,end`
 * @returns {{ rows: Array, groups: Array, active: boolean, clear: Function }} The rows left, the panel groups, whether any value is active and the clear
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
          ? bound.setFilter(spec.key, urlValueOf(spec, next))
          : setOwnSets(current => ({ ...current, [spec.key]: next })),
      t,
    })
  );
  return {
    rows: narrowRows(rows, specs, sets),
    groups,
    active: specs.some(spec => isActive(spec, sets[spec.key])),
    clear: () => (bound ? bound.clearFilters() : setOwnSets(emptySets(specs))),
  };
};
