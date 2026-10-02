const KIB = 1024;

const lower = value => String(value ?? '').toLowerCase();

/**
 * A byte count as hyperweaver-ui's database panel drew it: gigabytes
 * with two decimals, megabytes with one, whole kilobytes, bytes, and a
 * dash for a value that is no number.
 *
 * @param {*} bytes - The byte count
 * @returns {string} The size
 */
export const formatDatabaseBytes = bytes => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) {
    return '—';
  }
  if (bytes >= KIB ** 3) {
    return `${(bytes / KIB ** 3).toFixed(2)} GB`;
  }
  if (bytes >= KIB ** 2) {
    return `${(bytes / KIB ** 2).toFixed(1)} MB`;
  }
  if (bytes >= KIB) {
    return `${(bytes / KIB).toFixed(0)} KB`;
  }
  return `${bytes} B`;
};

/**
 * A count the agent answers as a number or as the list it counts, null
 * for neither.
 *
 * @param {*} value - The number or the list
 * @returns {number|null} The count
 */
export const countOf = value => {
  if (typeof value === 'number') {
    return value;
  }
  return Array.isArray(value) ? value.length : null;
};

/**
 * The files of one database, its `files` list or none.
 *
 * @param {Object} database - The database's row
 * @returns {Array<Object>} The files
 */
export const databaseFiles = database => (Array.isArray(database.files) ? database.files : []);

/**
 * The size of one database, hyperweaver-ui's: its `size` where the agent
 * answers a number, the sum of its files' sizes otherwise, null for
 * neither.
 *
 * @param {Object} database - The database's row
 * @returns {number|null} The bytes
 */
export const databaseSize = database => {
  if (typeof database.size === 'number') {
    return database.size;
  }
  const sum = databaseFiles(database).reduce(
    (total, file) => total + (typeof file.size === 'number' ? file.size : 0),
    0
  );
  return sum || null;
};

/**
 * The name of a database file, its name, its filename or its path.
 *
 * @param {Object} file - The file's row
 * @returns {string} The name
 */
export const fileName = file => file.name || file.filename || file.path || '';

/**
 * The databases of the statistics, the `databases` list or none.
 *
 * @param {Object|null} stats - The answer of `GET database/stats`
 * @returns {Array<Object>} The rows
 */
export const databaseRows = stats => (Array.isArray(stats?.databases) ? stats.databases : []);

export const PAGE_SIZE = 50;

/**
 * The `order_by` of a page of rows, the column with `:desc` while the
 * order is descending, none for no column.
 *
 * @param {string} orderBy - The column
 * @param {boolean} desc - Whether descending
 * @returns {string} The query value
 */
export const orderOf = (orderBy, desc) => {
  if (!orderBy) {
    return '';
  }
  return desc ? `${orderBy}:desc` : orderBy;
};

/**
 * The range a page of rows covers, hyperweaver-ui's: from one past the
 * offset to the lesser of the page's end and the total, zero for none.
 *
 * @param {number} offset - The page's offset
 * @param {number} total - The rows in all
 * @returns {{ from: number, to: number }} The range
 */
export const pageRange = (offset, total) => ({
  from: total === 0 ? 0 : offset + 1,
  to: Math.min(offset + PAGE_SIZE, total),
});

/**
 * The words hyperweaver-ui's vacuum notice carried: the reclaimed space of
 * every database, name and size.
 *
 * @param {Array<Object>} databases - The `databases` of the vacuum answer
 * @returns {string} The text
 */
export const reclaimedText = databases =>
  databases.map(row => `${row.name}: ${formatDatabaseBytes(row.space_reclaimed)}`).join(', ');

export const MAINTENANCE_ACTIONS = ['vacuum', 'analyze', 'cleanup'];

const matcher = membersOf => (row, needle) =>
  membersOf(row).some(text => lower(text).includes(needle));

export const matchesDatabase = matcher(row => [row.name, ...databaseFiles(row).map(fileName)]);

export const matchesDatabaseTable = matcher(row => [row.name]);
