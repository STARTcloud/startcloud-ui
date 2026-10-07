export const INBOX_EVENTS = [
  'notification-created',
  'notification-read',
  'notification-unread',
  'notification-dismissed',
  'inbox-read-all',
  'inbox-cleared',
];

const CREATED = 'notification-created';
const DISMISSED = 'notification-dismissed';
const CLEARED = 'inbox-cleared';

const holds = (rows, id) => rows.some(row => row.id === id);

const stampOf = data => (typeof data?.read_at === 'string' ? data.read_at : '');

const created = (rows, data, size) => {
  if (!data?.id || holds(rows, data.id)) {
    return rows;
  }
  return [data, ...rows].slice(0, size);
};

const flipped = (rows, id, readAt) =>
  rows.some(row => row.id === id && (row.read_at || null) !== readAt)
    ? rows.map(row => (row.id === id ? { ...row, read_at: readAt } : row))
    : rows;

const read = (rows, data) => {
  const stamp = stampOf(data);
  return stamp ? flipped(rows, data.id, stamp) : rows;
};

const unread = (rows, data) => flipped(rows, data?.id, null);

const dismissed = (rows, data) =>
  holds(rows, data?.id) ? rows.filter(row => row.id !== data.id) : rows;

const readAll = (rows, data) => {
  const stamp = stampOf(data);
  if (!stamp || rows.every(row => row.read_at)) {
    return rows;
  }
  return rows.map(row => (row.read_at ? row : { ...row, read_at: stamp }));
};

const cleared = rows => (rows.length > 0 ? [] : rows);

const REDUCERS = {
  [CREATED]: created,
  'notification-read': read,
  'notification-unread': unread,
  [DISMISSED]: dismissed,
  'inbox-read-all': readAll,
  [CLEARED]: cleared,
};

/**
 * The rows a list holds after one event of the `notifications` topic:
 * `notification-created` puts its row first, once, the list cut to
 * `size`; `notification-read` and `notification-unread` flip the row's
 * `read_at`; `notification-dismissed` removes the row; `inbox-read-all`
 * stamps every unread row with the event's `read_at`; `inbox-cleared`
 * empties the list. An event that changes nothing, a replayed one
 * included, answers the same array.
 *
 * @param {Array<Object>} rows - The rows held, as `GET /api/notifications` answers them
 * @param {string} name - The event's name
 * @param {Object} data - The event's data
 * @param {number} [size] - The most rows the list holds
 * @returns {Array<Object>} The rows after the event
 */
export const applyInboxEvent = (rows, name, data, size = Infinity) =>
  REDUCERS[name] ? REDUCERS[name](rows, data, size) : rows;

const totalAfter = ({ listing, rows, name, first }) => {
  if (name === CLEARED) {
    return 0;
  }
  if (name === CREATED && (!first || rows !== listing.rows)) {
    return listing.total + 1;
  }
  if (name === DISMISSED && rows !== listing.rows) {
    return Math.max(0, listing.total - 1);
  }
  return listing.total;
};

/**
 * One page of the inbox after one event of the `notifications` topic:
 * the rows through `applyInboxEvent`, a created row put on the first page
 * alone, and the total and the page count following, a created row
 * adding one, a dismissed row this page holds taking one away and a
 * cleared inbox answering none.
 *
 * @param {{ rows: Array<Object>, total: number, totalPages: number }} listing - The page held
 * @param {string} name - The event's name
 * @param {Object} data - The event's data
 * @param {{ size: number, first: boolean }} page - The page size and whether the page is the first
 * @returns {{ rows: Array<Object>, total: number, totalPages: number }} The page after the event
 */
export const applyInboxPage = (listing, name, data, { size, first }) => {
  const rows =
    name === CREATED && !first ? listing.rows : applyInboxEvent(listing.rows, name, data, size);
  const total = totalAfter({ listing, rows, name, first });
  if (rows === listing.rows && total === listing.total) {
    return listing;
  }
  return { rows, total, totalPages: size > 0 ? Math.ceil(total / size) : listing.totalPages };
};
