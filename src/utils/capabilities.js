import { GROUP_FIELDS, sortStackOf } from './prefs';

const tokenOf = entry => {
  if (typeof entry === 'string') {
    return entry;
  }
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return null;
  }
  const keys = Object.keys(entry);
  return keys.length === 1 ? keys[0] : null;
};

const subFlagsOf = entry => {
  if (typeof entry === 'string') {
    return [];
  }
  const [flags] = Object.values(entry);
  return Array.isArray(flags) ? flags : [];
};

const listsPath = (entries, [token, ...subFlags]) =>
  entries.some(entry => {
    if (tokenOf(entry) !== token) {
      return false;
    }
    return subFlags.length === 0 || listsPath(subFlagsOf(entry), subFlags);
  });

/**
 * Whether a value is one entry of a `features` list: a string, a feature
 * with no sub flags, or an object with exactly one key, the feature's
 * token, whose value is the list of its sub flags, each again such an
 * entry, to any depth.
 *
 * @param {*} entry - One entry of `features`, or of a feature's sub flags
 * @returns {boolean} True when the entry has that shape
 */
export const isFeatureEntry = entry => {
  if (typeof entry === 'string') {
    return true;
  }
  if (tokenOf(entry) === null) {
    return false;
  }
  const [flags] = Object.values(entry);
  return Array.isArray(flags) && flags.every(flag => isFeatureEntry(flag));
};

// Sub flags are how a feature carries its parts, because not everything can be a flat list. Reuse this concept for any feature that grows parts.
/**
 * Whether the host behind `status` advertises a feature and, where sub
 * flags are named, that part of it. An entry of `features` matches a
 * token when it is that string or an object whose one key is that token;
 * the sub flags are a path, each found the same way inside the list the
 * entry before it holds, so `hasFeature(status, 'tfa', 'sms')` asks for
 * `sms` inside `tfa`. A sub flag asked of a string entry is not found. A
 * host whose `features` is not an array renders everything.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} token - Feature token, e.g. 'admin', 'uploads', 'tfa'
 * @param {...string} subFlags - The path of sub flags inside the feature, e.g. 'sms'
 * @returns {boolean} True when the feature, and every sub flag on the path, is listed, or when the host lists no features at all
 */
export const hasFeature = (status, token, ...subFlags) => {
  const features = status?.features;
  if (!Array.isArray(features)) {
    return true;
  }
  return listsPath(features, [token, ...subFlags]);
};

/**
 * Whether the host behind `status` names a feature and, where sub flags
 * are named, that part of it, matched as `hasFeature` matches; no
 * render-all fallback, the array must carry it. It reads any object that
 * carries a `features` list the same way, a host row's `capabilities`
 * among them.
 *
 * @param {Object} status - The payload from `probeStatus`, or another object carrying `features`
 * @param {string} token - Feature token
 * @param {...string} subFlags - The path of sub flags inside the feature
 * @returns {boolean} True only when the features array names the token and every sub flag on the path
 */
export const hasFeatureStrict = (status, token, ...subFlags) =>
  Array.isArray(status?.features) && listsPath(status.features, [token, ...subFlags]);

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
