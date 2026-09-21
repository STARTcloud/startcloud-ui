const action = (key, labelKey, variant, extra = {}) => ({
  key,
  labelKey,
  variant,
  confirm: false,
  dialog: '',
  picker: '',
  ...extra,
});

/**
 * The two pickers of every bulk pane, each `picker` naming the menu the
 * pane draws in its place: Visibility over Private, Guests and Public,
 * Status over Publish and Unpublish, a pick sent as the wire verbs of
 * `VISIBILITY_VERBS` or `STATUS_VERBS` in order.
 */
const VISIBILITY = action('visibility', 'pages.table.visibility', 'btn-outline-secondary', {
  picker: 'visibility',
});

const STATUS = action('status', 'pages.table.status', 'btn-outline-secondary', {
  picker: 'status',
});

const DEPRECATE = action('deprecate', 'pages.bulk.deprecate', 'btn-outline-warning');

const DELETE = action('delete', 'pages.bulk.delete', 'btn-outline-danger', { confirm: true });

/**
 * The three verbs that open what they act on, the ones `recursive: true`
 * rides while the pick's scope is everything beneath; the others close
 * and run beneath on their own.
 */
export const OPENING_VERBS = ['make_public', 'allow_guests', 'publish'];

/**
 * The wire verbs a visibility pick means, closing first so every state
 * between the calls stays valid: Private turns both words off, Guests
 * turns public off then guests on, Public turns guests off then public on.
 */
export const VISIBILITY_VERBS = {
  private: ['make_private', 'deny_guests'],
  guests: ['make_private', 'allow_guests'],
  public: ['deny_guests', 'make_public'],
};

export const STATUS_VERBS = { publish: ['publish'], unpublish: ['unpublish'] };

/**
 * The bulk actions every level but the versions offers on a collection the
 * estate writes to: the two pickers, then the delete.
 */
export const ROW_BULK = [VISIBILITY, STATUS, DELETE];

/**
 * The bulk actions a version level offers: the two pickers, the
 * deprecation, then the delete.
 */
export const VERSION_BULK = [VISIBILITY, STATUS, DEPRECATE, DELETE];

/**
 * The two dialog actions a downloads level adds, each `dialog` naming the
 * dialog the collection's `BulkDialog` slot draws before the call: Edit
 * sends `set` with a `values` object of the level's members, Move to
 * sends `move` with a target address.
 */
const EDIT = action('set', 'pages.bulk.edit', 'btn-outline-secondary', { dialog: 'values' });

const MOVE = action('move', 'pages.bulk.move', 'btn-outline-secondary', { dialog: 'move' });

export const DOWNLOAD_ITEM_BULK = [VISIBILITY, STATUS, EDIT, DELETE];

export const DOWNLOAD_RELEASE_BULK = [VISIBILITY, STATUS, EDIT, MOVE, DEPRECATE, DELETE];

export const DOWNLOAD_PATCH_BULK = [VISIBILITY, STATUS, EDIT, MOVE, DELETE];

export const DOWNLOAD_FILE_BULK = [VISIBILITY, STATUS, EDIT, MOVE, DELETE];
