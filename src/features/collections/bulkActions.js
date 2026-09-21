const action = (key, labelKey, variant, extra = {}) => ({
  key,
  labelKey,
  variant,
  confirm: false,
  opens: false,
  dialog: '',
  ...extra,
});

const DELETE = action('delete', 'pages.bulk.delete', 'btn-outline-danger', { confirm: true });

const DEPRECATE = action('deprecate', 'pages.bulk.deprecate', 'btn-outline-warning');

/**
 * The six access verbs every row carrying its own `is_public`,
 * `guest_access` and `published` words offers, the item, its versions or
 * releases, its providers or patches and its architectures or files
 * alike, in the order the action pane draws them; `opens` marks the three
 * that widen a row, the ones the cascade check draws for, the other three
 * closing every row beneath on their own.
 */
const ACCESS_BULK = [
  action('make_public', 'pages.bulk.makePublic', 'btn-outline-info', { opens: true }),
  action('make_private', 'pages.bulk.makePrivate', 'btn-outline-secondary'),
  action('allow_guests', 'pages.bulk.allowGuests', 'btn-outline-primary', { opens: true }),
  action('deny_guests', 'pages.bulk.denyGuests', 'btn-outline-secondary'),
  action('publish', 'pages.bulk.publish', 'btn-outline-primary', { opens: true }),
  action('unpublish', 'pages.bulk.unpublish', 'btn-outline-warning'),
];

/**
 * The bulk actions every level but the versions offers on a collection the
 * estate writes to: the six access verbs, then the delete.
 */
export const ROW_BULK = [...ACCESS_BULK, DELETE];

/**
 * The bulk actions a version or release level offers: the six access
 * verbs, the deprecation, then the delete.
 */
export const VERSION_BULK = [...ACCESS_BULK, DEPRECATE, DELETE];

/**
 * The three actions a downloads level adds, each `dialog` naming the
 * dialog the collection's `BulkDialog` slot draws before the call: `set`
 * takes a `values` object of the level's members, `move` a target
 * address, and `reconcile` turns off beneath every word a row holds off,
 * confirmed like a delete because it closes rows.
 */
const SET = action('set', 'pages.bulk.setValues', 'btn-outline-secondary', { dialog: 'values' });

const MOVE = action('move', 'pages.bulk.move', 'btn-outline-secondary', { dialog: 'move' });

const RECONCILE = action('reconcile', 'pages.bulk.reconcile', 'btn-outline-warning', {
  confirm: true,
});

export const DOWNLOAD_ITEM_BULK = [...ACCESS_BULK, SET, RECONCILE, DELETE];

export const DOWNLOAD_RELEASE_BULK = [...ACCESS_BULK, DEPRECATE, SET, MOVE, RECONCILE, DELETE];

export const DOWNLOAD_PATCH_BULK = [...ACCESS_BULK, SET, MOVE, RECONCILE, DELETE];

export const DOWNLOAD_FILE_BULK = [...ACCESS_BULK, SET, MOVE, DELETE];
