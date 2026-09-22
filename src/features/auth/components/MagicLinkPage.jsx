import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { magicLinkConsume } from '../../../lib/signin';
import { returnToShape } from '../../../utils/auth';

import LinkConsumePage from './LinkConsumePage';

/**
 * `/login/magic`: consumes the mail's `email` and `token` through
 * `POST /login/magic` and follows `next` with the bus handed along, so
 * `login` is emitted where the page stays in-router; the invalid state
 * links to a fresh request.
 */
const MagicLinkPage = ({ returnTo, events }) => {
  const { t } = useTranslation(['auth']);
  return (
    <LinkConsumePage
      path="/login/magic"
      consume={magicLinkConsume}
      returnTo={returnTo}
      title={t('login.magic.title')}
      invalidCode="magic_link_invalid"
      another={{ to: '/login?login=magic_link', label: t('login.magic.requestAnother') }}
      events={events}
    />
  );
};

MagicLinkPage.propTypes = {
  returnTo: returnToShape.isRequired,
  events: PropTypes.shape({ emit: PropTypes.func.isRequired }).isRequired,
};

export default MagicLinkPage;
