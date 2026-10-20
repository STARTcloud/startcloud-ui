import { notAfterOf } from './records';
import { recordOf } from './sync';

/**
 * The key of this browser's Vault among the stores a secret is kept in,
 * the key its `sync` map names it by.
 */
export const VAULT = 'vault';

const NO_SYNC = {};

/**
 * The stable id of one wire row across every store: the id of the record
 * it carries, the row's own id while it carries none.
 *
 * @param {Object} row - The wire row
 * @returns {string} The id
 */
export const stableIdOf = row => String(row.record?.id || row.id);

/**
 * The record a wire row stands for, keyed by its stable id.
 *
 * @param {Object} row - The wire row
 * @returns {Object} The record
 */
export const rowRecordOf = row => ({ ...recordOf(row), id: stableIdOf(row) });

/**
 * The content two copies of one secret are compared by: the kind, the
 * name, the profile, the secret members, the extra members, both DER
 * halves, the tags and the notes; the store's own members, the access
 * words and the `sync` map are left out.
 *
 * @param {Object} record - The record
 * @returns {string} The content as one string
 */
export const contentOf = record =>
  JSON.stringify([
    record.kind || '',
    record.name || '',
    record.profile || '',
    record.secret ?? null,
    record.extra ?? {},
    record.public_der_b64 ?? null,
    record.private_der_b64 ?? null,
    record.tags ?? [],
    record.notes ?? '',
  ]);

const stampOf = copy => copy.record.updated_at || copy.row?.updated_at || '';

/**
 * One copy of a secret a store holds: the record of the Vault, or the
 * wire row of a remote store with the record it stands for.
 *
 * @param {Object} source - `{ record }` for the Vault, `{ row }` for a remote store
 * @returns {{ id: string, record: Object, row: Object|null, stamp: string, content: string }} The copy
 */
export const copyOf = ({ record = null, row = null }) => {
  const held = row ? rowRecordOf(row) : record;
  const copy = { id: row ? stableIdOf(row) : String(held.id), record: held, row };
  return { ...copy, stamp: stampOf(copy), content: contentOf(held) };
};

const newestOf = copies =>
  copies.reduce((best, copy) => (copy.stamp > best.stamp ? copy : best), copies[0]);

const organizationOf = copies =>
  copies.map(copy => copy.row?.organization || copy.record.organization || '').find(Boolean) || '';

const mergedOf = (id, held) => {
  const copies = Object.values(held);
  const newest = newestOf(copies);
  const wire = copies.find(copy => copy.row)?.row || null;
  const { record } = newest;
  return {
    ...record,
    id,
    kind: record.kind,
    name: record.name,
    profile: record.profile || '',
    organization: organizationOf(copies),
    subject: wire?.subject || record.facts?.subject_dn || '',
    not_after: wire?.not_after || notAfterOf(record),
    published: Boolean(wire ? wire.published : record.published),
    is_public: Boolean(wire ? wire.is_public : record.is_public),
    guest_access: Boolean(wire ? wire.guest_access : record.guest_access),
    created_by: wire?.created_by || record.created_by || '',
    updated_at: newest.stamp,
    record,
    held,
  };
};

/**
 * Every secret the stores hold, one row a stable id: each store's
 * copies keyed under the store's key in `held`, the newest copy's record
 * as `record` and its members laid over the row, the organization the
 * first copy names, the wire row's subject, end and access words where a
 * remote store holds one.
 *
 * @param {Array<{ key: string, copies: Array<Object> }>} stores - The stores with their copies
 * @returns {Array<Object>} The rows
 */
export const unionOf = stores => {
  const byId = new Map();
  stores.forEach(store =>
    store.copies.forEach(copy => {
      const held = byId.get(copy.id) || {};
      byId.set(copy.id, { ...held, [store.key]: copy });
    })
  );
  return [...byId.entries()].map(([id, held]) => mergedOf(id, held));
};

/**
 * Where one row stands in one store: `equal` while the store holds a copy
 * whose content is the newest copy's, `behind` while it holds an older
 * one, `none` while it holds none.
 *
 * @param {Object} row - The row of `unionOf`
 * @param {string} key - The store's key
 * @returns {'equal'|'behind'|'none'} The state
 */
export const presenceOf = (row, key) => {
  const copy = row.held[key];
  if (!copy) {
    return 'none';
  }
  return copy.content === contentOf(row.record) ? 'equal' : 'behind';
};

/**
 * The row's own `sync` map, the one the Vault's copy carries first, then
 * the first remote copy that carries one, empty while none does.
 *
 * @param {Object} row - The row of `unionOf`
 * @returns {Object<string, boolean>} The map
 */
export const syncMapOf = row => {
  const copies = Object.entries(row.held)
    .sort(([a], [b]) => (a === VAULT ? -1 : Number(b === VAULT)))
    .map(([, copy]) => copy.record.sync);
  return copies.find(map => map && typeof map === 'object') || NO_SYNC;
};

/**
 * Whether a row syncs to a store: the row's own map wins, else the
 * preference's default for the store, on unless the person turned it
 * off.
 *
 * @param {Object} row - The row of `unionOf`
 * @param {string} key - The store's key
 * @param {Object|null} defaults - The `sync` preference, `{ [store]: boolean }`
 * @returns {boolean} True while the row syncs to the store
 */
export const syncsRow = (row, key, defaults) => {
  const own = syncMapOf(row)[key];
  return typeof own === 'boolean' ? own : defaults?.[key] !== false;
};

/**
 * The copies one row would need written so every store it syncs to holds
 * its newest content: one `{ row, key }` a store the row syncs to and
 * does not hold equal.
 *
 * @param {Array<Object>} rows - The rows of `unionOf`
 * @param {Array<string>} keys - The keys of the stores written to
 * @param {Object|null} defaults - The `sync` preference
 * @returns {Array<{ row: Object, key: string }>} The writes
 */
export const pendingWrites = (rows, keys, defaults) =>
  rows.flatMap(row =>
    keys
      .filter(key => syncsRow(row, key, defaults) && presenceOf(row, key) !== 'equal')
      .map(key => ({ row, key }))
  );
