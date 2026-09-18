import PropTypes from 'prop-types';

/**
 * The app's side of the shared admin pages: the update check on a host
 * that answers one (`updateStatus` present, absent on a `cookie` host); the
 * configuration files with their schemas, the merge-patch write,
 * the restart status, the restart and the one `action(route, method, body)`
 * on a host whose `status.config` names a file (`config` present, absent
 * on a backend with no files); the `users` and `organizations` adapters
 * the identity feature's Users and All organizations pages draw over on
 * a host with accounts of its own (each present only there); the storage
 * usage on a host that answers it (`storage` present).
 */
export const adminShape = PropTypes.shape({
  users: PropTypes.shape({
    list: PropTypes.func.isRequired,
    suspend: PropTypes.func,
    resume: PropTypes.func,
    remove: PropTypes.func,
  }),
  organizations: PropTypes.shape({
    list: PropTypes.func.isRequired,
    update: PropTypes.func.isRequired,
    remove: PropTypes.func.isRequired,
    suspend: PropTypes.func,
    resume: PropTypes.func,
  }),
  config: PropTypes.shape({
    get: PropTypes.func.isRequired,
    schema: PropTypes.func.isRequired,
    update: PropTypes.func.isRequired,
    restartStatus: PropTypes.func.isRequired,
    restart: PropTypes.func.isRequired,
    action: PropTypes.func.isRequired,
  }),
  storage: PropTypes.func,
  updateStatus: PropTypes.func,
});
