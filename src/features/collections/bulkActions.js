const action = (key, labelKey, variant, confirm = false) => ({ key, labelKey, variant, confirm });

const DELETE = action('delete', 'pages.bulk.delete', 'btn-outline-danger', true);

/**
 * The six access verbs every row carrying its own `is_public`,
 * `guest_access` and `published` words offers, the item, its versions or
 * releases, its providers or patches and its architectures or files
 * alike, in the order the action pane draws them.
 */
const ACCESS_BULK = [
  action('make_public', 'pages.bulk.makePublic', 'btn-outline-info'),
  action('make_private', 'pages.bulk.makePrivate', 'btn-outline-secondary'),
  action('allow_guests', 'pages.bulk.allowGuests', 'btn-outline-primary'),
  action('deny_guests', 'pages.bulk.denyGuests', 'btn-outline-secondary'),
  action('publish', 'pages.bulk.publish', 'btn-outline-primary'),
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
export const VERSION_BULK = [
  ...ACCESS_BULK,
  action('deprecate', 'pages.bulk.deprecate', 'btn-outline-warning'),
  DELETE,
];
