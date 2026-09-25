/**
 * Whether the host's role has About text, so the chrome draws an About
 * link only where `/about` answers a page: the locale carries
 * `about.<role>.description`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} i18n - The i18next instance
 * @returns {boolean} True when the role's About keys exist
 */
export const hasAbout = (status, i18n) => i18n.exists(`about.${status.role}.description`);
