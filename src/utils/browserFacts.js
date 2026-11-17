const EMPTY_MEMBERS = ['timezone', 'language', 'locale', 'hour_cycle', 'region'];
const DEVICE_MEMBERS = ['device_mode', 'device_motion'];
const HOUR_CYCLES = { h11: 'h12', h12: 'h12', h23: 'h23', h24: 'h23' };
const DARK_QUERY = '(prefers-color-scheme: dark)';
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

const resolved = options => {
  try {
    return new Intl.DateTimeFormat(undefined, options).resolvedOptions();
  } catch {
    return {};
  }
};

const matches = query => {
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
};

/**
 * The time zone the browser runs in, an IANA zone name; empty when the
 * browser cannot say.
 *
 * @returns {string} The zone
 */
export const detectedZone = () => resolved().timeZone || '';

/**
 * The locale the browser writes dates and numbers in, a BCP 47 tag;
 * empty when the browser cannot say.
 *
 * @returns {string} The locale
 */
export const detectedLocale = () => resolved().locale || '';

/**
 * The clock the browser reads, `h12` or `h23`, `h11` read as `h12` and
 * `h24` as `h23`; empty when the browser cannot say.
 *
 * @returns {string} The hour cycle
 */
export const detectedHourCycle = () => HOUR_CYCLES[resolved({ hour: 'numeric' }).hourCycle] || '';

/**
 * The scheme the device asks for, `dark` while `prefers-color-scheme:
 * dark` matches, else `light`.
 *
 * @returns {string} The device's mode
 */
export const deviceMode = () => (matches(DARK_QUERY) ? 'dark' : 'light');

/**
 * Whether the device asks for reduced motion, `reduce` while
 * `prefers-reduced-motion: reduce` matches, else `auto`.
 *
 * @returns {string} The device's motion
 */
export const deviceMotion = () => (matches(REDUCE_QUERY) ? 'reduce' : 'auto');

/**
 * The preferences patch the browser's facts yield against an account's
 * preferences: `timezone`, `language`, `locale`, `hour_cycle` and
 * `region` each sent only while the account holds `null` and the fact
 * is known, `device_mode` and `device_motion` each sent while the fact
 * differs from the account's; empty when nothing is to be sent.
 *
 * @param {Object} preferences - The account's preferences, `GET /api/user/preferences`
 * @param {Object} facts - The browser's facts by member name
 * @returns {Object} The patch
 */
export const browserFactsPatch = (preferences, facts) => {
  const patch = {};
  EMPTY_MEMBERS.forEach(member => {
    if (preferences?.[member] === null && facts[member]) {
      patch[member] = facts[member];
    }
  });
  DEVICE_MEMBERS.forEach(member => {
    if (facts[member] && member in (preferences || {}) && facts[member] !== preferences[member]) {
      patch[member] = facts[member];
    }
  });
  return patch;
};
