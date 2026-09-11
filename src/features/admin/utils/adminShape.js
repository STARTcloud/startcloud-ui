import PropTypes from 'prop-types';

/**
 * The app's side of the shared admin pages: the update check on a host
 * that answers one (`updateStatus` present, absent on a `cookie` host); the
 * configuration files with their schemas, the merge-patch write,
 * the restart status, the restart and the one `action(route, method, body)`
 * on a host whose `status.config` names a file (`config` present, absent
 * on a backend with no files); the organizations with their members and
 * the suspend, resume, rename, edit and delete calls over them on a host
 * with accounts of its own (`organizationsWithUsers` present); the storage
 * usage on a host that answers it (`storage` present).
 */
export const adminShape = PropTypes.shape({
  organizationsWithUsers: PropTypes.func,
  organization: PropTypes.func,
  updateOrganization: PropTypes.func,
  accessMode: PropTypes.func,
  suspendOrganization: PropTypes.func,
  resumeOrganization: PropTypes.func,
  removeOrganization: PropTypes.func,
  removeMember: PropTypes.func,
  removeUser: PropTypes.func,
  suspendUser: PropTypes.func,
  resumeUser: PropTypes.func,
  gravatarProfile: PropTypes.func,
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
