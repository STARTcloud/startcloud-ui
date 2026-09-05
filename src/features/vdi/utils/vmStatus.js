import { cacheKey } from './cacheLevel';

export const STALE_THRESHOLD_SEC = 600;
export const WARN_AGE_SEC = 300;

export const STATUS_KEYS = [
  'healthy',
  'cifs_broken',
  'icons_missing',
  'stale',
  'no_user',
  'standby',
  'decommissioned',
];

const STATUS_CLASSES = {
  healthy: 'text-bg-success',
  cifs_broken: 'text-bg-danger',
  icons_missing: 'text-bg-warning',
  stale: 'text-bg-warning',
  no_user: 'text-bg-secondary',
  standby: 'text-bg-secondary',
  decommissioned: 'text-bg-dark',
};

const NO_USER_ORDER = ['available', 'standby', 'in_use', 'assigned'];

/**
 * Seconds since an ISO timestamp, infinite for none.
 * @param {string|null|undefined} iso - The timestamp
 * @param {number} now - The reference epoch in milliseconds
 * @returns {number} The age in seconds
 */
export const ageSeconds = (iso, now) => (iso ? (now - new Date(iso).getTime()) / 1000 : Infinity);

export const vmKey = vm => vm.instance_id || vm.hostname;

export const vmIsDecommissioned = vm => vm.status === 'decommissioned';

export const vmIsStandby = vm => Boolean(vm._synthetic) || vm.uds?.cache_level === 2;

export const vmHasSession = vm =>
  vm.user?.session_state === 'active' || vm.user?.session_state === 'idle';

export const vmHasNoSession = vm => {
  if (vm._synthetic || !vm.last_checkin) {
    return true;
  }
  return !vm.user || vm.user.session_state === 'no_session';
};

/**
 * The health of one VM at `now`: decommissioned, standby, stale, then the
 * drives, then the icons, else healthy.
 * @param {Object} vm - The vm object the host answers
 * @param {number} now - The reference epoch in milliseconds
 * @returns {string} One of `STATUS_KEYS`
 */
export const vmStatus = (vm, now) => {
  if (vmIsDecommissioned(vm)) {
    return 'decommissioned';
  }
  if (vmIsStandby(vm)) {
    return 'standby';
  }
  if (ageSeconds(vm.last_checkin, now) > STALE_THRESHOLD_SEC) {
    return 'stale';
  }
  if ((vm.drives || []).some(drive => drive.status !== 'healthy')) {
    return 'cifs_broken';
  }
  const desktop = vm.desktop?.status;
  if (desktop !== undefined && desktop !== 'ok' && desktop !== 'n_a') {
    return 'icons_missing';
  }
  return 'healthy';
};

export const statusBadgeClass = status => STATUS_CLASSES[status] || 'text-bg-secondary';

/**
 * How stale a VM's agents are: a score of 0, 0.5 or 1 (a VM with a session
 * expects two agents, each worth a half), and which of the two is stale.
 * @param {Object} vm - The vm object
 * @param {number} now - The reference epoch in milliseconds
 * @returns {{ score: number, startupStale: boolean, userStale: boolean }} The stale info
 */
export const vmStaleInfo = (vm, now) => {
  if (vmIsStandby(vm) || !vm.last_checkin) {
    return { score: 0, startupStale: false, userStale: false };
  }
  const hasSession = vmHasSession(vm);
  const startupStale = ageSeconds(vm.last_startup_checkin, now) > STALE_THRESHOLD_SEC;
  const userStale = hasSession && ageSeconds(vm.last_user_checkin, now) > STALE_THRESHOLD_SEC;
  if (hasSession) {
    return { score: (startupStale ? 0.5 : 0) + (userStale ? 0.5 : 0), startupStale, userStale };
  }
  return { score: startupStale ? 1 : 0, startupStale, userStale: false };
};

/**
 * The label key of a VM that never checked in: powered off for a standby
 * cache entry, no check-in otherwise, empty for a VM with a check-in.
 * @param {Object} vm - The vm object
 * @returns {string} A `vdi.status.*` key or ''
 */
export const noCheckinLabel = vm => {
  if (vm._synthetic && vm.uds?.cache_level === 2) {
    return 'vdi.status.poweredOff';
  }
  if (vm._synthetic || !vm.last_checkin) {
    return 'vdi.status.noCheckin';
  }
  return '';
};

/**
 * A colour from red through orange to green for a ratio of 0 to 1.
 * @param {number} ratio - The ratio
 * @returns {string} An `rgb()` colour
 */
export const ratioColor = ratio => {
  const r = Math.max(0, Math.min(1, ratio));
  if (r >= 0.5) {
    const t = (r - 0.5) * 2;
    return `rgb(${Math.round(255 + (76 - 255) * t)},${Math.round(152 + (175 - 152) * t)},${Math.round(80 * t)})`;
  }
  const t = r * 2;
  return `rgb(${Math.round(244 + (255 - 244) * t)},${Math.round(67 + (152 - 67) * t)},${Math.round(54 - 54 * t)})`;
};

const countNoUser = (vm, breakdown) => {
  const key = cacheKey(vm.uds);
  if (key) {
    breakdown[key] = (breakdown[key] || 0) + 1;
  }
};

/**
 * The five status cards' numbers over every VM: the counts per status,
 * the VMs with a session, the stale score, the two denominators and the
 * no-session breakdown per cache level in card order.
 * @param {Array<Object>} vms - Every vm object
 * @param {number} now - The reference epoch in milliseconds
 * @returns {Object} The summary
 */
export const fleetSummary = (vms, now) => {
  const counts = Object.fromEntries(STATUS_KEYS.map(key => [key, 0]));
  const breakdown = {};
  let sessionCount = 0;
  let staleScore = 0;
  let total = 0;
  let totalWithStandby = 0;
  vms.forEach(vm => {
    const status = vmStatus(vm, now);
    if (status === 'decommissioned') {
      counts.decommissioned += 1;
      return;
    }
    totalWithStandby += 1;
    const standby = vmIsStandby(vm);
    if (vmHasNoSession(vm) || standby) {
      counts.no_user += 1;
      countNoUser(vm, breakdown);
    }
    if (standby) {
      counts.standby += 1;
      return;
    }
    total += 1;
    counts[status] += 1;
    if (vmHasSession(vm)) {
      sessionCount += 1;
    }
    staleScore += vmStaleInfo(vm, now).score;
  });
  return {
    counts,
    sessionCount,
    staleScore,
    total,
    totalWithStandby,
    noUserBreakdown: NO_USER_ORDER.filter(key => breakdown[key]).map(key => ({
      key,
      count: breakdown[key],
    })),
  };
};
