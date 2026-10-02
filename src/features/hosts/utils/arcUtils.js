const GIB = 1024 ** 3;

const PERCENT = 100;

/**
 * A byte count in gibibytes, zero for nothing.
 *
 * @param {number} bytes - The bytes
 * @returns {number} The gibibytes
 */
export const bytesToGb = bytes => {
  if (!bytes || Number.isNaN(Number(bytes))) {
    return 0;
  }
  return Number(bytes) / GIB;
};

/**
 * A byte count in gibibytes, zero where the count is no number.
 *
 * @param {number} bytes - The bytes
 * @returns {number} The gibibytes
 */
export const safeBytesToGb = bytes => {
  const result = bytesToGb(bytes);
  return Number.isNaN(result) ? 0 : result;
};

/**
 * A typed value as a number, null for nothing and for text that is none.
 *
 * @param {*} value - The typed value
 * @returns {number|null} The number
 */
export const safeParseFloat = value => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * A typed value with two decimals, null for none.
 *
 * @param {*} value - The typed value
 * @returns {string|null} The text
 */
export const formatGbValue = value => {
  const parsed = safeParseFloat(value);
  return parsed === null ? null : parsed.toFixed(2);
};

/**
 * A byte count as hyperweaver-ui's ARC panel drew it, two decimals in
 * steps of 1024.
 *
 * @param {number} bytes - The bytes
 * @returns {string} The size
 */
export const formatBytes = bytes => {
  if (!bytes) {
    return '0 B';
  }
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  return `${(bytes / 1024 ** index).toFixed(2)} ${sizes[index]}`;
};

/**
 * The tone of the validation alert: danger while errors are listed,
 * warning while warnings are, success otherwise.
 *
 * @param {Array} errors - Validation errors
 * @param {Array} warnings - Validation warnings
 * @returns {string} The Bootstrap tone
 */
export const getValidationColor = (errors, warnings) => {
  if (errors && errors.length > 0) {
    return 'danger';
  }
  if (warnings && warnings.length > 0) {
    return 'warning';
  }
  return 'success';
};

/**
 * The filled share of a slider as a percent, hyperweaver-ui's gradient
 * stop: none while the value is unset, the value's place between the
 * bounds otherwise, held between nothing and everything.
 *
 * @param {*} value - The slider's value
 * @param {number} min - The lower bound
 * @param {number} max - The upper bound
 * @returns {string} The percent, `NN%`
 */
export const sliderFill = (value, min, max) => {
  const parsed = safeParseFloat(value);
  if (parsed === null || max <= min) {
    return '0%';
  }
  const percent = ((parsed - min) / (max - min)) * PERCENT;
  return `${Math.min(PERCENT, Math.max(0, percent))}%`;
};

/**
 * The form the ARC configuration opens with, every tunable unset and
 * the persistent apply method.
 */
export const ARC_FORM = {
  arc_max_gb: '',
  arc_min_gb: '',
  arc_max_percent: '',
  user_reserve_hint_pct: '',
  arc_meta_limit_gb: '',
  arc_meta_min_gb: '',
  vdev_max_pending: '',
  prefetch_disable: false,
  apply_method: 'persistent',
};

const gbOf = tunable => (tunable?.effective_value ? bytesToGb(tunable.effective_value) : '');

/**
 * The form read from the agent's tunables, hyperweaver-ui's: the sizes
 * in gibibytes, the percents and the pending count as they are, and
 * prefetching disabled while its tunable reads one.
 *
 * @param {Object|null} tunables - The `available_tunables` of the configuration
 * @returns {Object} The form
 */
export const arcFormOf = tunables => {
  if (!tunables) {
    return ARC_FORM;
  }
  return {
    arc_max_gb: gbOf(tunables.zfs_arc_max),
    arc_min_gb: gbOf(tunables.zfs_arc_min),
    arc_max_percent: tunables.zfs_arc_max_percent?.effective_value || '',
    user_reserve_hint_pct: tunables.user_reserve_hint_pct?.effective_value || '',
    arc_meta_limit_gb: gbOf(tunables.zfs_arc_meta_limit),
    arc_meta_min_gb: gbOf(tunables.zfs_arc_meta_min),
    vdev_max_pending: tunables.zfs_vdev_max_pending?.effective_value || '',
    prefetch_disable: tunables.zfs_prefetch_disable?.effective_value === 1,
    apply_method: 'persistent',
  };
};

/**
 * Whether the form names a tunable to write.
 *
 * @param {Object} form - The form, the shape of `ARC_FORM`
 * @returns {boolean} True when anything is set
 */
export const hasArcSettings = form =>
  Boolean(
    form.arc_max_gb ||
    form.arc_min_gb ||
    form.arc_max_percent ||
    form.user_reserve_hint_pct ||
    form.vdev_max_pending ||
    form.prefetch_disable
  );

/**
 * The body of `POST system/zfs/arc/validate`, the max and the min in
 * gibibytes where given.
 *
 * @param {Object} form - The form, the shape of `ARC_FORM`
 * @returns {Object} The body
 */
export const arcValidateBody = form => ({
  ...(form.arc_max_gb ? { arc_max_gb: parseFloat(form.arc_max_gb) } : {}),
  ...(form.arc_min_gb ? { arc_min_gb: parseFloat(form.arc_min_gb) } : {}),
});

/**
 * The body of `PUT system/zfs/arc/config`, hyperweaver-ui's: the apply
 * method, every size and percent given, and `prefetch_disable` always.
 *
 * @param {Object} form - The form, the shape of `ARC_FORM`
 * @returns {Object} The body
 */
export const arcApplyBody = form => ({
  apply_method: form.apply_method,
  ...arcValidateBody(form),
  ...(form.arc_max_percent ? { arc_max_percent: parseInt(form.arc_max_percent, 10) } : {}),
  ...(form.user_reserve_hint_pct
    ? { user_reserve_hint_pct: parseInt(form.user_reserve_hint_pct, 10) }
    : {}),
  ...(form.arc_meta_limit_gb ? { arc_meta_limit_gb: parseFloat(form.arc_meta_limit_gb) } : {}),
  ...(form.arc_meta_min_gb ? { arc_meta_min_gb: parseFloat(form.arc_meta_min_gb) } : {}),
  ...(form.vdev_max_pending ? { vdev_max_pending: parseInt(form.vdev_max_pending, 10) } : {}),
  prefetch_disable: Boolean(form.prefetch_disable),
});

/**
 * The bounds and the value of the two size sliders, hyperweaver-ui's
 * arithmetic over the system constraints: the max between the min set
 * or recommended and the safe max, the min between the recommended and
 * the max set or safe, two decimals each.
 *
 * @param {Object} form - The form, the shape of `ARC_FORM`
 * @param {Object|null} constraints - The `system_constraints` of the configuration
 * @returns {{ max: Object, min: Object }} Each `{ min, max, value }` as text
 */
export const arcSliderBounds = (form, constraints) => {
  if (!constraints) {
    return {
      max: { min: '1', max: '100', value: form.arc_max_gb || '50' },
      min: { min: '0.5', max: '100', value: form.arc_min_gb || '1' },
    };
  }
  const recommended = safeBytesToGb(constraints.min_recommended_arc_bytes);
  const safe = safeBytesToGb(constraints.max_safe_arc_bytes);
  const maxMin = Math.max(safeParseFloat(form.arc_min_gb) || 0, recommended).toFixed(2);
  const minMax = form.arc_max_gb
    ? Math.min(parseFloat(form.arc_max_gb), safe).toFixed(2)
    : safe.toFixed(2);
  return {
    max: { min: maxMin, max: safe.toFixed(2), value: form.arc_max_gb || safe.toFixed(2) },
    min: {
      min: recommended.toFixed(2),
      max: minMax,
      value: form.arc_min_gb || recommended.toFixed(2),
    },
  };
};
