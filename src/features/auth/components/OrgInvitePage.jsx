import PropTypes from 'prop-types';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { returnToShape } from '../../../utils/auth';
import { consumeInvite } from '../api/invitations';

import LinkConsumePage from './LinkConsumePage';

/**
 * `/org/invite/:token`: consumes the mail's token through `POST /org/invite`
 * and follows `next` wherever it leads: `/login` for an anonymous visitor,
 * the server keeping this page as the request the sign-in resumes,
 * `/user/organizations` with the membership made, an onboarding step the
 * join leaves owed, the place a gate parked or a client's URL when the join
 * settles the last step, `/login?error=account_suspended` for a suspended
 * account; a `403` `invite_invalid`, `invite_wrong_account` or `suspended`
 * draws its own message with a link to asking for a new invitation.
 */
const OrgInvitePage = ({ returnTo, events }) => {
  const { t } = useTranslation(['auth']);
  const { token = '' } = useParams();
  const read = useCallback(() => ({ body: { token }, complete: Boolean(token) }), [token]);
  return (
    <LinkConsumePage
      path="/org/invite"
      read={read}
      consume={consumeInvite}
      returnTo={returnTo}
      title={t('invite.title')}
      invalidCode="invite_invalid"
      another={{ to: '/user/organizations', label: t('invite.requestAnother') }}
      events={events}
    />
  );
};

OrgInvitePage.propTypes = {
  returnTo: returnToShape.isRequired,
  events: PropTypes.shape({ emit: PropTypes.func.isRequired }).isRequired,
};

export default OrgInvitePage;
