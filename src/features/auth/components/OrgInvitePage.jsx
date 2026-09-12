import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { returnToShape } from '../../../utils/auth';
import { consumeInvite } from '../api/invitations';

import LinkConsumePage from './LinkConsumePage';

const pathnameOf = target => String(target || '').split(/[?#]/)[0];

/**
 * `/org/invite/:token`: consumes the mail's token through `POST /org/invite`
 * and follows `next`, `/user/organizations` with the membership made, or
 * `/login` for an anonymous visitor with this page kept as the return path;
 * the invalid state links to asking for a new invitation.
 */
const OrgInvitePage = ({ returnTo }) => {
  const { t } = useTranslation(['auth']);
  const { token = '' } = useParams();
  const consume = useCallback(
    body =>
      consumeInvite(body).then(answer => {
        if (pathnameOf(answer?.next) === '/login') {
          returnTo.remember(`/org/invite/${encodeURIComponent(token)}`);
        }
        return answer;
      }),
    [returnTo, token]
  );
  return (
    <LinkConsumePage
      path="/org/invite"
      read={() => ({ body: { token }, complete: Boolean(token) })}
      consume={consume}
      returnTo={returnTo}
      title={t('invite.title')}
      invalidCode="invite_invalid"
      another={{ to: '/user/organizations', label: t('invite.requestAnother') }}
    />
  );
};

OrgInvitePage.propTypes = {
  returnTo: returnToShape.isRequired,
};

export default OrgInvitePage;
