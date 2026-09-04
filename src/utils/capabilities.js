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
 * entry of `auth`, `backend` when the array is missing or empty.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @returns {string} 'backend' or 'idp'
 */
export const authMethod = status => status?.auth?.[0] || 'backend';
