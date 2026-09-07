import PropTypes from 'prop-types';

/**
 * The app's side of the shared admin pages: the update check on every
 * host; the configuration files with their schemas, restart, SMTP test and
 * SSL upload on a host that serves them (`config` present); the
 * organizations with their members and the suspend, resume, rename, edit
 * and delete calls over them on a host with accounts of its own
 * (`organizationsWithUsers` present); the storage usage on a host that
 * answers it (`storage` present).
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
    restart: PropTypes.func.isRequired,
    testSmtp: PropTypes.func.isRequired,
    uploadSsl: PropTypes.func.isRequired,
  }),
  storage: PropTypes.func,
  updateStatus: PropTypes.func.isRequired,
});
