import { newId, newRecord, notAfterOf } from './records';

/**
 * The wire row of one record, the body a POST or a PUT to `/api/certs`
 * carries: the organization, the kind, the name, the profile, the three
 * access words and the record itself, its private half, the DER and the
 * `secret` members, dropped while the row is public.
 *
 * @param {Object} record - The record
 * @param {string} organization - The organization the row belongs to
 * @returns {Object} The body
 */
export const rowOf = (record, organization) => ({
  organization: record.organization || organization,
  kind: record.kind,
  name: record.name,
  profile: record.profile || '',
  published: Boolean(record.published),
  is_public: Boolean(record.is_public),
  guest_access: Boolean(record.guest_access),
  record: {
    ...record,
    private_der_b64: record.is_public ? null : record.private_der_b64,
    secret: record.is_public ? null : record.secret || null,
  },
});

/**
 * The record a wire row stands for: the row's record with the row's own
 * members laid over it, `origin` shared and `remote_id` the row's id; a
 * row that carries no record becomes one of its kind with no facts.
 *
 * @param {Object} row - The wire row
 * @returns {Object} The record
 */
export const recordOf = row => {
  const held = row.record && typeof row.record === 'object' ? row.record : {};
  return newRecord({
    ...held,
    id: held.id || newId(),
    kind: row.kind || held.kind || 'certificate',
    name: row.name || held.name || '',
    profile: row.profile || held.profile || '',
    updated_at: row.updated_at || held.updated_at || new Date().toISOString(),
    origin: 'shared',
    remote_id: row.id,
    organization: row.organization || held.organization || '',
    created_by: row.created_by || held.created_by || '',
    synced_at: row.updated_at || '',
    published: Boolean(row.published),
    is_public: Boolean(row.is_public),
    guest_access: Boolean(row.guest_access),
  });
};

/**
 * The members a record takes once the store let it go: its local copy
 * kept, the row's members cleared, so it stands as a local record again.
 */
export const DETACHED = {
  origin: 'local',
  remote_id: null,
  organization: '',
  created_by: '',
  synced_at: null,
  published: false,
  is_public: false,
  guest_access: false,
};

/**
 * The members a record keeps of the serving backend's row, each of
 * `DETACHED`'s keys as the record holds it.
 *
 * @param {Object} record - The record
 * @returns {Object} The members
 */
export const ownMembersOf = record =>
  Object.fromEntries(Object.keys(DETACHED).map(key => [key, record[key] ?? DETACHED[key]]));

/**
 * The record a store's answer links: the record with the answered row's
 * id as `remote_id`, its organization, its creator and its `updated_at`
 * as `synced_at`, each kept from the record where the answer omits it.
 *
 * @param {Object} record - The record sent
 * @param {Object} row - The wire row the store answered
 * @param {string} organization - The organization the row was sent to
 * @returns {Object} The linked record
 */
export const linkedRecord = (record, row, organization) => ({
  ...record,
  remote_id: row.id,
  organization: row.organization || organization,
  created_by: row.created_by || record.created_by,
  synced_at: row.updated_at || record.synced_at,
});

/**
 * Whether a wire row is newer than the record held for it.
 *
 * @param {Object} row - The wire row
 * @param {Object|null} held - The record held under the row's id, or null
 * @returns {boolean} True when the row should replace the record
 */
export const newerThan = (row, held) =>
  !held || new Date(row.updated_at || 0).getTime() > new Date(held.updated_at || 0).getTime();

/**
 * The end a wire row's subject reads its status from.
 *
 * @param {Object} row - The wire row
 * @returns {string} The end, empty for none
 */
export const rowNotAfter = row => row.not_after || (row.record ? notAfterOf(row.record) : '');

const VERB_PATCHES = {
  make_private: { is_public: false },
  make_public: { is_public: true },
  deny_guests: { guest_access: false },
  allow_guests: { guest_access: true },
  publish: { published: true },
  unpublish: { published: false },
};

/**
 * The access words a run of the bulk verbs leaves a row with, the verbs
 * folded in order into the one body a PUT carries.
 *
 * @param {Array<string>} verbs - The wire verbs, `VISIBILITY_VERBS` or `STATUS_VERBS`
 * @returns {Object} The access members the verbs set
 */
export const patchOfVerbs = verbs =>
  verbs.reduce((patch, verb) => ({ ...patch, ...(VERB_PATCHES[verb] || {}) }), {});
