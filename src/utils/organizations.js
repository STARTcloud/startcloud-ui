import PropTypes from 'prop-types';

/**
 * The app's side of the shared organization console and discovery pages:
 * the organization's record, access mode, members and their roles, the
 * invitations and join requests it manages, the discoverable organizations
 * and the join request a visitor sends, and the Gravatar lookup behind
 * the logos and member avatars; `resendInvitation` and `stats` where the
 * host answers an invitation's resend and the organization's counts, the
 * console drawing Resend and the counts while they are carried.
 */
export const organizationsShape = PropTypes.shape({
  get: PropTypes.func.isRequired,
  update: PropTypes.func.isRequired,
  accessMode: PropTypes.func.isRequired,
  users: PropTypes.func.isRequired,
  memberRole: PropTypes.func.isRequired,
  removeMember: PropTypes.func.isRequired,
  invite: PropTypes.func.isRequired,
  invitations: PropTypes.func.isRequired,
  removeInvitation: PropTypes.func.isRequired,
  resendInvitation: PropTypes.func,
  stats: PropTypes.func,
  requests: PropTypes.func.isRequired,
  approveRequest: PropTypes.func.isRequired,
  denyRequest: PropTypes.func.isRequired,
  discover: PropTypes.func.isRequired,
  join: PropTypes.func.isRequired,
  gravatarProfile: PropTypes.func.isRequired,
});

export const membershipsOf = current => current?.organizations || [];
