const NETWORK_COLOR_VARS = [
  'var(--hw-topo-net-1)',
  'var(--hw-topo-net-2)',
  'var(--hw-topo-net-3)',
  'var(--hw-topo-net-4)',
  'var(--hw-topo-net-5)',
  'var(--hw-topo-net-6)',
  'var(--hw-topo-net-7)',
  'var(--hw-topo-net-8)',
];

export const INTERNAL_NET_COLOR = 'var(--hw-topo-net-internal)';
export const GHOST_COLOR = 'var(--hw-topo-ghost)';
export const PENDING_COLOR = 'var(--hw-topo-pending)';

const WIDTH_BASE = 4;
const WIDTH_STEP = 2;
const WIDTH_CAP = 18;
const PERIOD_MIN = 0.5;
const PERIOD_BASE = 3.2;
const PERIOD_STEP = 1.1;
const PERCENT = 100;
const GIGABIT = 1000;
const KILO = 1000;

/**
 * The color of every network id, hyperweaver-ui's rule: the networks
 * ranked by live member count, the largest first, take the eight hues
 * in turn, an internal network the reserved neutral and a planned-only
 * network the ghost color, so the same screen always colors the same
 * way.
 *
 * @param {Array<{ id: string, kind: string, live: number }>} networks - The networks
 * @returns {Map<string, string>} Network id to CSS color
 */
export const assignNetworkColors = networks => {
  const colors = new Map();
  const ranked = networks
    .filter(net => net.kind !== 'internal' && net.live > 0)
    .sort((a, b) => b.live - a.live || String(a.id).localeCompare(String(b.id)));
  ranked.forEach((net, index) => {
    colors.set(net.id, NETWORK_COLOR_VARS[index % NETWORK_COLOR_VARS.length]);
  });
  networks.forEach(net => {
    if (!colors.has(net.id)) {
      colors.set(net.id, net.live > 0 ? INTERNAL_NET_COLOR : GHOST_COLOR);
    }
  });
  return colors;
};

/**
 * A wire's width from its member count, `4 + 2·√n`, capped at 18, the
 * one width rule the legend states.
 *
 * @param {number} count - The members
 * @returns {number} The width
 */
export const widthForCount = count => {
  const n = Math.max(0, Number(count) || 0);
  return Math.min(WIDTH_CAP, WIDTH_BASE + WIDTH_STEP * Math.sqrt(n));
};

export const MOTION_TRAFFIC = 'traffic';
export const MOTION_IDLE = 'idle';
export const MOTION_NO_FEED = 'no-feed';

/**
 * The three-state motion grammar: measured traffic moves, measured idle
 * is still with an explicit zero, no feed is still with hollow caps;
 * motion without a measurement is impossible by construction.
 *
 * @param {boolean} feedPresent - Whether the host has a usage feed
 * @param {{ rxMbps: number, txMbps: number }|null} usage - The rates
 * @returns {string} One of `MOTION_TRAFFIC`, `MOTION_IDLE` and `MOTION_NO_FEED`
 */
export const motionState = (feedPresent, usage) => {
  if (!feedPresent) {
    return MOTION_NO_FEED;
  }
  const total = (usage?.rxMbps || 0) + (usage?.txMbps || 0);
  return total > 0 ? MOTION_TRAFFIC : MOTION_IDLE;
};

/**
 * The dash animation's period in seconds for a rate, faster with more
 * traffic, log-scaled so kilobits and gigabits both read as motion.
 *
 * @param {number} totalMbps - The rate
 * @returns {number} The seconds, zero for no traffic
 */
export const flowPeriod = totalMbps => {
  if (totalMbps <= 0) {
    return 0;
  }
  return Math.max(PERIOD_MIN, PERIOD_BASE - Math.log10(totalMbps + 1) * PERIOD_STEP);
};

/**
 * A utilization fraction, 0 to 1, of a rate against a link speed, zero
 * for an unknown speed.
 *
 * @param {number} totalMbps - The rate
 * @param {number} speedMbps - The link speed
 * @returns {number} The fraction
 */
export const utilization = (totalMbps, speedMbps) => {
  const speed = Number(speedMbps) || 0;
  if (speed <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, (Number(totalMbps) || 0) / speed));
};

const RAMP = [
  { to: 10, hue: [240, -20], sat: [85, 10], light: [55, 10] },
  { to: 25, hue: [220, -40], sat: [95, 0], light: [65, 5] },
  { to: 50, hue: [180, -60], sat: [95, -15], light: [70, 0] },
  { to: 75, hue: [120, -60], sat: [80, 15], light: [70, -5] },
  { to: 90, hue: [60, -30], sat: [95, 0], light: [65, -5] },
  { to: 100, hue: [30, -30], sat: [95, 5], light: [60, -10] },
];

/**
 * The temperature color of a utilization fraction, hyperweaver-ui's one
 * HSL ramp, blue idle through cyan, green, yellow and orange to red.
 *
 * @param {number} frac - The fraction, 0 to 1
 * @returns {string} An `hsl()` color, the idle flow color for zero
 */
export const utilizationColor = frac => {
  const u = Math.min(1, Math.max(0, frac)) * PERCENT;
  if (u === 0) {
    return 'var(--hw-topo-idle-flow)';
  }
  const index = RAMP.findIndex(step => u <= step.to);
  const step = RAMP[index];
  const from = index === 0 ? 0 : RAMP[index - 1].to;
  const f = (u - from) / (step.to - from);
  const hue = step.hue[0] + f * step.hue[1];
  const sat = step.sat[0] + f * step.sat[1];
  const light = step.light[0] + f * step.light[1];
  return `hsl(${Math.round(hue)}, ${Math.round(sat)}%, ${Math.round(light)}%)`;
};

const formatMbps = mbps => {
  const v = Number(mbps) || 0;
  if (v >= GIGABIT) {
    return `${(v / GIGABIT).toFixed(1)} Gbps`;
  }
  if (v >= 1) {
    return `${v.toFixed(1)} Mbps`;
  }
  return `${Math.round(v * KILO)} Kbps`;
};

/**
 * The rate labels of a usage, null while the host has no feed, a
 * measured zero reading as zero.
 *
 * @param {boolean} feedPresent - Whether the host has a usage feed
 * @param {{ rxMbps: number, txMbps: number }|null} usage - The rates
 * @returns {{ rx: string, tx: string, total: string }|null} The labels
 */
export const rateLabels = (feedPresent, usage) => {
  if (!feedPresent) {
    return null;
  }
  const rx = usage?.rxMbps || 0;
  const tx = usage?.txMbps || 0;
  return { rx: formatMbps(rx), tx: formatMbps(tx), total: formatMbps(rx + tx) };
};
