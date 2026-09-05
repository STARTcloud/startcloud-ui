export const CACHE_KEYS = ['in_use', 'assigned', 'available', 'standby'];

const BADGE_CLASSES = {
  in_use: 'bg-primary bg-opacity-25 text-primary-emphasis',
  assigned: 'bg-info bg-opacity-25 text-info-emphasis',
  available: 'bg-success bg-opacity-25 text-success-emphasis',
  standby: 'bg-secondary bg-opacity-25 text-secondary-emphasis',
};

const SORT_KEYS = { in_use: 0, assigned: 1, available: 2, standby: 3 };

/**
 * The cache level of a VM as one key: `in_use` or `assigned` at level 0 by
 * `uds_in_use`, `available` at 1, `standby` at 2, `level_N` beyond, empty
 * without UDS data.
 * @param {Object|null|undefined} uds - The vm's `uds` object
 * @returns {string} The key
 */
export const cacheKey = uds => {
  if (!uds || uds.cache_level === null || uds.cache_level === undefined) {
    return '';
  }
  if (uds.cache_level === 0) {
    return uds.uds_in_use ? 'in_use' : 'assigned';
  }
  if (uds.cache_level === 1) {
    return 'available';
  }
  if (uds.cache_level === 2) {
    return 'standby';
  }
  return `level_${uds.cache_level}`;
};

/**
 * The translated cache-level label, empty without UDS data.
 * @param {Object|null|undefined} uds - The vm's `uds` object
 * @param {Function} t - The translator
 * @returns {string} The label
 */
export const cacheLabel = (uds, t) => {
  const key = cacheKey(uds);
  if (!key) {
    return '';
  }
  return CACHE_KEYS.includes(key)
    ? t(`vdi.cache.${key}`)
    : t('vdi.cache.level', { level: uds.cache_level });
};

export const cacheBadgeClass = uds =>
  BADGE_CLASSES[cacheKey(uds)] || 'bg-secondary bg-opacity-25 text-body';

export const cacheSortKey = uds => {
  const key = cacheKey(uds);
  return key in SORT_KEYS ? SORT_KEYS[key] : 9;
};
