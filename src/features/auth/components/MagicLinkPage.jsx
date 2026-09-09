import { useTranslation } from 'react-i18next';

import { magicLinkConsume } from '../../../lib/signin';
import { returnToShape } from '../../../utils/auth';

import LinkConsumePage from './LinkConsumePage';

/**
 * `/login/magic`: consumes the mail's `email` and `token` through
 * `POST /login/magic` and follows `next`; the invalid state links to a
 * fresh request.
 */
const MagicLinkPage = ({ returnTo }) => {
  const { t } = useTranslation(['auth']);
  return (
    <LinkConsumePage
      path="/login/magic"
      consume={magicLinkConsume}
      returnTo={returnTo}
      title={t('login.magic.title')}
      invalidCode="magic_link_invalid"
      another={{ to: '/login?login=magic_link', label: t('login.magic.requestAnother') }}
    />
  );
};

MagicLinkPage.propTypes = {
  returnTo: returnToShape.isRequired,
};

export default MagicLinkPage;
