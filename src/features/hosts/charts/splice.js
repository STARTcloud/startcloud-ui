const GAP_INTERVALS = 2;
const HALF = 2;

/**
 * The origin of a record the stream pushed.
 */
export const LIVE = 'live';

/**
 * The origin of a record a history read answered.
 */
export const HISTORY = 'history';

const instantOf = row => new Date(row?.scan_timestamp).getTime();

const nameOf = (row, entity) => (entity ? String(row[entity]) : '');

/**
 * One sample as the store keeps it: the series key, the sample's
 * `scan_timestamp` in milliseconds, the name of its entity, the empty
 * string for a series of one entity, its origin and the row itself;
 * null for a row without an instant or without the entity member the
 * series names.
 *
 * @param {Object} options - The series, the row, the entity member and the origin
 * @param {string} options.series - The series key
 * @param {Object} options.row - The sample
 * @param {string} [options.entity] - The member that tells one entity's rows from another's
 * @param {string} options.origin - `LIVE` or `HISTORY`
 * @returns {{ series: string, instant: number, entity: string, origin: string, row: Object }|null} The record
 */
export const recordOf = ({ series, row, entity = '', origin }) => {
  const instant = instantOf(row);
  if (!Number.isFinite(instant) || (entity && !row[entity])) {
    return null;
  }
  return { series, instant, entity: nameOf(row, entity), origin, row };
};

/**
 * The records of many rows, the rows without an instant or an entity left
 * out.
 *
 * @param {Object} options - The series, the rows, the entity member and the origin
 * @param {string} options.series - The series key
 * @param {Array<Object>} options.rows - The samples
 * @param {string} [options.entity] - The member that tells one entity's rows from another's
 * @param {string} options.origin - `LIVE` or `HISTORY`
 * @returns {Array<Object>} The records
 */
export const recordsOf = ({ series, rows, entity = '', origin }) =>
  rows.map(row => recordOf({ series, row, entity, origin })).filter(Boolean);

/**
 * Whether a row is a gap `withGaps` inserted, a row every value reader
 * answers null for.
 *
 * @param {Object} row - The row
 * @returns {boolean} True for a gap row
 */
export const isGap = row => row?.gap === true;

const gapRow = (at, entity, name) => ({
  scan_timestamp: new Date(at).toISOString(),
  gap: true,
  ...(entity ? { [entity]: name } : {}),
});

/**
 * The rows with a gap row between two neighbouring rows of one entity
 * that lie more than two live intervals apart, the gap at the midpoint,
 * so a stopped agent draws as a break; the rows unchanged while the live
 * interval is unknown.
 *
 * @param {Array<Object>} rows - The rows, oldest first
 * @param {number} liveIntervalMs - The agent's live interval in milliseconds, zero while unknown
 * @param {string} [entity] - The member that tells one entity's rows from another's
 * @returns {Array<Object>} The rows with the gaps
 */
export const withGaps = (rows, liveIntervalMs, entity = '') => {
  if (!(liveIntervalMs > 0)) {
    return rows;
  }
  const widest = liveIntervalMs * GAP_INTERVALS;
  const last = new Map();
  return rows.flatMap(row => {
    const name = nameOf(row, entity);
    const at = instantOf(row);
    const before = last.get(name);
    last.set(name, at);
    return before !== undefined && at - before > widest
      ? [gapRow((before + at) / HALF, entity, name), row]
      : [row];
  });
};
