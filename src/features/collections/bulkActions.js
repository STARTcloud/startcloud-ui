const action = (key, labelKey, variant, confirm = false) => ({ key, labelKey, variant, confirm });

/**
 * The bulk actions an item level offers on a collection the estate writes
 * to, in the order the action pane draws them.
 */
export const ITEM_BULK = [
  action('make_public', 'pages.bulk.makePublic', 'btn-outline-info'),
  action('make_private', 'pages.bulk.makePrivate', 'btn-outline-secondary'),
  action('publish', 'pages.bulk.publish', 'btn-outline-primary'),
  action('unpublish', 'pages.bulk.unpublish', 'btn-outline-warning'),
  action('delete', 'pages.bulk.delete', 'btn-outline-danger', true),
];

/**
 * The bulk actions a version level offers.
 */
export const VERSION_BULK = [
  action('deprecate', 'pages.bulk.deprecate', 'btn-outline-warning'),
  action('delete', 'pages.bulk.delete', 'btn-outline-danger', true),
];

/**
 * The bulk actions the levels under a version offer: the delete alone.
 */
export const DELETE_BULK = [action('delete', 'pages.bulk.delete', 'btn-outline-danger', true)];
