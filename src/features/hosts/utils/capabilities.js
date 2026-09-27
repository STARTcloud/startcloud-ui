const listOf = value => (Array.isArray(value) ? value : []);

/**
 * Whether a host's row names a feature token in its
 * `capabilities.features`, checked strictly: a row without the list names
 * nothing, because a row the Controls menu draws fires an agent request
 * that an agent without the surface answers 404.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {string} token - The feature token, e.g. `machine-suspend`
 * @returns {boolean} True only when the list names the token
 */
export const hostHasFeature = (server, token) =>
  listOf(server?.capabilities?.features).includes(token);

/**
 * Whether a host's row names a hypervisor in its
 * `capabilities.hypervisors`, `bhyve`, `virtualbox` or `utm`, the positive
 * check the rows that exist on one hypervisor alone are gated by.
 *
 * @param {Object|null} server - The registry row, or the one serving agent's
 * @param {string} name - The hypervisor
 * @returns {boolean} True when the list names it
 */
export const hostHasHypervisor = (server, name) =>
  listOf(server?.capabilities?.hypervisors).includes(name);
