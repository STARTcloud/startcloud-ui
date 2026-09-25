import { GROUP_FIELDS, sortStackOf } from './prefs';

/**
 * Whether the host behind `status` advertises a feature token; a host
 * whose `features` is not an array renders everything.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} token - Feature token, e.g. 'admin', 'uploads', 'deploy'
 * @returns {boolean} True when the token is present, or when the host lists no features at all
 */
export const hasFeature = (status, token) => {
  const features = status?.features;
  if (!Array.isArray(features)) {
    return true;
  }
  return features.includes(token);
};

/**
 * Whether the host behind `status` names a feature token; no render-all
 * fallback, the array must carry it.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} token - Feature token
 * @returns {boolean} True only when the features array names the token
 */
export const hasFeatureStrict = (status, token) =>
  Array.isArray(status?.features) && status.features.includes(token);

/**
 * Whether the host behind `status` mounts a collection.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} token - Collection token, e.g. 'boxes', 'isos', 'provisioners'
 * @returns {boolean} True when the collections array names the token
 */
export const hasCollection = (status, token) =>
  Array.isArray(status?.collections) && status.collections.includes(token);

/**
 * The session the UI creates for the host behind `status`: the first
 * entry of `auth` (`backend`, `idp` or `cookie`, the identity provider's
 * own session on its origin), `none` when the array is empty (everyone
 * sees everything, no session), `backend` when the array is missing.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @returns {string} 'backend', 'idp', 'cookie' or 'none'
 */
export const authMethod = status => {
  const auth = status?.auth;
  if (!Array.isArray(auth)) {
    return 'backend';
  }
  return auth[0] || 'none';
};

/**
 * The sort stack the host behind `status` names for one level of one
 * collection, `status.sorts[collection][level]` read through the stored
 * sort reader so a malformed entry answers no stack; null while the host
 * names none, so the collection's or the page's own default stands.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} collection - Collection key, e.g. 'downloads'
 * @param {string} level - 'items', 'versions', 'providers' or 'architectures'
 * @returns {Array<{ column: string, direction: string }>|null} The stack, or null
 */
export const hostSort = (status, collection, level) => {
  const stack = sortStackOf(status?.sorts?.[collection]?.[level]);
  return stack.length > 0 ? stack : null;
};

/**
 * The field the host behind `status` groups one level of one collection
 * by, `status.groups[collection][level]`, `family` or `vendor`; null
 * while the host names none or names a word the page cannot group by, so
 * a host that says nothing groups nothing below the organization.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} collection - Collection key, e.g. 'downloads'
 * @param {string} level - 'items', 'versions', 'providers' or 'architectures'
 * @returns {string|null} The field, or null
 */
export const hostGroup = (status, collection, level) => {
  const field = status?.groups?.[collection]?.[level];
  return GROUP_FIELDS.includes(field) ? field : null;
};
