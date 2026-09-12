import { filterGroupsOf } from './itemShape';

const VIEWS = ['table', 'cards'];

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

const defaultHidden = columns =>
  columns.filter(column => column.defaultHidden).map(column => column.key);

const plainSets = sets =>
  Object.fromEntries(Object.entries(sets).map(([key, set]) => [key, [...set]]));

export const readPrefs = (key, collections) => {
  const saved = parse(key);
  const filters = {};
  const sort = {};
  const hiddenColumns = {};
  collections.forEach(collection => {
    filters[collection.key] = Object.fromEntries(
      filterGroupsOf(collection).map(group => [
        group.key,
        setOf(saved.filters?.[collection.key]?.[group.key]),
      ])
    );
    sort[collection.key] = sortStackOf(saved.sort?.[collection.key]);
    hiddenColumns[collection.key] = setOf(
      saved.hiddenColumns?.[collection.key] ?? defaultHidden(collection.columns)
    );
  });
  return {
    filters,
    collection: setOf(saved.collection),
    visibility: setOf(saved.visibility),
    watched: setOf(saved.watched),
    sort,
    view: VIEWS.includes(saved.view) ? saved.view : collections[0].defaultView,
    collapsed: saved.collapsed || {},
    hiddenColumns,
  };
};

export const writePrefs = (
  key,
  { filters, collection, visibility, watched, sort, view, collapsed, hiddenColumns }
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
      view,
      collapsed,
      hiddenColumns: plainSets(hiddenColumns),
    })
  );
};

/**
 * A page's table preferences under one `table_prefs_*` key, the session
 * contract's one object per key: the sort stack, the hidden column keys,
 * and, on a page with the view toggle, the chosen view among `views`.
 *
 * @param {string} key - The localStorage key
 * @param {Array} columns - The table's columns, `defaultHidden` ones hidden until saved
 * @param {Object} [options]
 * @param {string[]} [options.views] - The views the page toggles between, the first the default
 * @returns {{ sort: Array, hiddenColumns: Set, view?: string }} The preferences
 */
export const readDetailPrefs = (key, columns, { views = null } = {}) => {
  const saved = parse(key);
  return {
    sort: sortStackOf(saved.sort),
    hiddenColumns: setOf(saved.hiddenColumns ?? defaultHidden(columns)),
    ...(views ? { view: views.includes(saved.view) ? saved.view : views[0] } : {}),
  };
};

/**
 * Writes a page's table preferences as the one object of `readDetailPrefs`,
 * `view` only while the page holds one.
 *
 * @param {string} key - The localStorage key
 * @param {{ sort?: Array, hiddenColumns?: Set, view?: string }} prefs - The preferences
 */
export const writeDetailPrefs = (key, { sort = [], hiddenColumns = new Set(), view = '' }) => {
  localStorage.setItem(
    key,
    JSON.stringify({ sort, hiddenColumns: [...hiddenColumns], ...(view ? { view } : {}) })
  );
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

export const toggleIn = (set, value) => {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
};
