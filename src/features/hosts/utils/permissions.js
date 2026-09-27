export const PERMISSION_LEVELS = {
  user: 1,
  admin: 2,
  'super-admin': 3,
};

/**
 * Whether `role`, the hyperweaver-server member's own role, ranks at or
 * above `minLevel` in `PERMISSION_LEVELS`; an unknown role ranks nowhere.
 *
 * @param {string|undefined} role - `user`, `admin` or `super-admin`
 * @param {string} minLevel - The least role allowed
 * @returns {boolean}
 */
export const hasMinPermission = (role, minLevel) =>
  PERMISSION_LEVELS[role] >= PERMISSION_LEVELS[minLevel];

/** Every role may start and stop machines. */
export const canStartStopMachines = role => hasMinPermission(role, 'user');

/** Every role may restart and reset machines. */
export const canRestartMachines = role => hasMinPermission(role, 'user');

/** An admin alone may kill or destroy a machine. */
export const canDestroyMachines = role => hasMinPermission(role, 'admin');

/** An admin alone may restart or power off a host. */
export const canPowerOffHosts = role => hasMinPermission(role, 'admin');

/** An admin alone controls a host. */
export const canControlHosts = role => hasMinPermission(role, 'admin');
