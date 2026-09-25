import { filterGroupsOf } from './itemShape';

const VIEWS = ['table', 'cards'];

/**
 * The fields a listing can group its items by, the words a host's
 * `groups` entry and a person's Group by pick may carry.
 */
export const GROUP_FIELDS = ['family', 'vendor'];

/**
 * The stored Group by pick of one collection: a group field as itself,
 * the empty string as no grouping, anything else as no pick, so the
 * host's `groups` entry stands.
 *
 * @param {*} saved - The stored value
 * @returns {string|null} The field, '' for none, or null for no pick
 */
export const groupPickOf = saved => (saved === '' || GROUP_FIELDS.includes(saved) ? saved : null);

const parse = key => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') || {};
  } catch {
    return {};
  }
};

const setOf = values => new Set(Array.isArray(values) ? values : []);

const isSortEntry = entry =>
  Boolean(entry) && typeof entry.column === 'string' && entry.column !== '';

/**
 * The stored sort as a stack: a saved array of entries, a saved single
 * entry as a one-entry stack, anything else as no sort.
 *
 * @param {*} saved - The stored value
 * @returns {Array<{ column: string, direction: string }>} The stack
 */
export const sortStackOf = saved => {
  if (Array.isArray(saved)) {
    return saved.filter(isSortEntry);
  }
  return isSortEntry(saved) ? [{ column: saved.column, direction: saved.direction }] : [];
};

const DEFAULT_SIZE = 25;

const defaultHidden = columns =>
  columns.filter(column => column.defaultHidden).map(column => column.key);

const plainSets = sets =>
  Object.fromEntries(Object.entries(sets).map(([key, set]) => [key, [...set]]));

const isPixels = value => typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * The stored column widths as a map of column key to pixels, every entry
 * that is not a positive number dropped, anything but an object as no
 * widths.
 *
 * @param {*} saved - The stored value
 * @returns {Object<string, number>} The widths
 */
export const widthsOf = saved =>
  saved && typeof saved === 'object' && !Array.isArray(saved)
    ? Object.fromEntries(Object.entries(saved).filter(([, pixels]) => isPixels(pixels)))
    : {};

/**
 * The widths after one column resize: `pixels` set for `key`, or the key
 * removed for `null`, so the stylesheet's width stands again.
 *
 * @param {Object<string, number>} widths - The current widths
 * @param {string} key - The column key
 * @param {number|null} pixels - The new width, null to reset
 * @returns {Object<string, number>} The next widths
 */
export const withWidth = (widths, key, pixels) => {
  const next = { ...widths };
  if (pixels === null) {
    delete next[key];
  } else {
    next[key] = pixels;
  }
  return next;
};

export const readPrefs = (key, collections) => {
  const saved = parse(key);
  const filters = {};
  const sort = {};
  const groupBy = {};
  const hiddenColumns = {};
  const widths = {};
  collections.forEach(collection => {
    filters[collection.key] = Object.fromEntries(
      filterGroupsOf(collection).map(group => [
        group.key,
        setOf(saved.filters?.[collection.key]?.[group.key]),
      ])
    );
    sort[collection.key] = sortStackOf(saved.sort?.[collection.key]);
    groupBy[collection.key] = groupPickOf(saved.group?.[collection.key]);
    hiddenColumns[collection.key] = setOf(
      saved.hiddenColumns?.[collection.key] ?? defaultHidden(collection.columns)
    );
    widths[collection.key] = widthsOf(saved.widths?.[collection.key]);
  });
  return {
    filters,
    collection: setOf(saved.collection),
    visibility: setOf(saved.visibility),
    watched: setOf(saved.watched),
    sort,
    group: groupBy,
    view: VIEWS.includes(saved.view) ? saved.view : collections[0].defaultView,
    collapsed: saved.collapsed || {},
    hiddenColumns,
    widths,
  };
};

export const writePrefs = (
  key,
  { filters, collection, visibility, watched, sort, group, view, collapsed, hiddenColumns, widths }
) => {
  localStorage.setItem(
    key,
    JSON.stringify({
      filters: Object.fromEntries(
        Object.entries(filters).map(([collectionKey, groups]) => [collectionKey, plainSets(groups)])
      ),
      collection: [...collection],
      visibility: [...visibility],
      watched: [...watched],
      sort,
      group: Object.fromEntries(Object.entries(group).filter(([, pick]) => pick !== null)),
      view,
      collapsed,
      hiddenColumns: plainSets(hiddenColumns),
      widths,
    })
  );
};

/**
 * A page's table preferences under one `table_prefs_*` key, the session
 * contract's one object per key: the sort stack, the hidden column keys,
 * the column widths (column key to pixels, empty when none was resized),
 * the page size (25 when absent), and, on a page with the view toggle, the
 * chosen view among `views`.
 *
 * @param {string} key - The localStorage key
 * @param {Array} columns - The table's columns, `defaultHidden` ones hidden until saved
 * @param {Object} [options]
 * @param {string[]} [options.views] - The views the page toggles between, the first the default
 * @returns {{ sort: Array, hiddenColumns: Set, widths: Object, size: number, view?: string }} The preferences
 */
export const readDetailPrefs = (key, columns, { views = null } = {}) => {
  const saved = parse(key);
  return {
    sort: sortStackOf(saved.sort),
    hiddenColumns: setOf(saved.hiddenColumns ?? defaultHidden(columns)),
    widths: widthsOf(saved.widths),
    size: typeof saved.size === 'number' ? saved.size : DEFAULT_SIZE,
    ...(views ? { view: views.includes(saved.view) ? saved.view : views[0] } : {}),
  };
};

/**
 * Writes a page's table preferences as the one object of `readDetailPrefs`,
 * `view` only while the page holds one, `folds` kept as it is.
 *
 * @param {string} key - The localStorage key
 * @param {{ sort?: Array, hiddenColumns?: Set, widths?: Object, size?: number, view?: string }} prefs - The preferences
 */
export const writeDetailPrefs = (
  key,
  { sort = [], hiddenColumns = new Set(), widths = {}, size = DEFAULT_SIZE, view = '' }
) => {
  const { folds } = parse(key);
  localStorage.setItem(
    key,
    JSON.stringify({
      sort,
      hiddenColumns: [...hiddenColumns],
      widths,
      size,
      ...(view ? { view } : {}),
      ...(folds ? { folds } : {}),
    })
  );
};

const foldsOf = saved =>
  saved && typeof saved === 'object' && !Array.isArray(saved)
    ? Object.fromEntries(Object.entries(saved).map(([id, folded]) => [id, Boolean(folded)]))
    : {};

/**
 * The folds a page's section cards keep under its `table_prefs_*` key,
 * `folds` of the one object per key: section id to `true` while folded,
 * a section never folded absent and so open.
 *
 * @param {string} key - The localStorage key, empty for no storage
 * @returns {Object<string, boolean>} The folds
 */
export const readFolds = key => (key ? foldsOf(parse(key).folds) : {});

/**
 * Writes a page's folds as the `folds` member of its one object, the
 * other members left as they are.
 *
 * @param {string} key - The localStorage key, empty for no storage
 * @param {Object<string, boolean>} folds - The folds
 */
export const writeFolds = (key, folds) => {
  if (!key) {
    return;
  }
  localStorage.setItem(key, JSON.stringify({ ...parse(key), folds }));
};

export const emptyFilters = collections => ({
  filters: Object.fromEntries(
    collections.map(collection => [
      collection.key,
      Object.fromEntries(filterGroupsOf(collection).map(group => [group.key, new Set()])),
    ])
  ),
  collection: new Set(),
  visibility: new Set(),
  watched: new Set(),
});

const ELSEWHERE_FOLD_KEY = 'navbar_search_elsewhere';

/**
 * Whether the navbar search's app-wide results block is folded, kept as
 * one boolean under its own key rather than a page's `table_prefs_*`
 * object.
 *
 * @returns {boolean} Whether it is folded
 */
export const readElsewhereFold = () => {
  try {
    return localStorage.getItem(ELSEWHERE_FOLD_KEY) === 'folded';
  } catch {
    return false;
  }
};

/**
 * Writes the navbar search's app-wide results fold.
 *
 * @param {boolean} folded - Whether the block is folded
 */
export const writeElsewhereFold = folded => {
  localStorage.setItem(ELSEWHERE_FOLD_KEY, folded ? 'folded' : '');
};

export const toggleIn = (set, value) => {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
};
