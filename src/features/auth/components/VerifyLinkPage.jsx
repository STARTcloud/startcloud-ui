import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { returnToShape } from '../../../utils/auth';
import { verifyRegistration } from '../api/registration';

import LinkConsumePage from './LinkConsumePage';

/**
 * `/registration/verify`: consumes the mail's `email` and `token` through
 * `POST /registration/verify` and follows `next` wherever it leads, the
 * first onboarding step, the place a gate parked or a client's URL, with
 * the bus handed along so `login` is emitted where the page stays
 * in-router; the invalid state offers "Send a new link".
 */
const VerifyLinkPage = ({ returnTo, events }) => {
  const { t } = useTranslation(['auth']);
  return (
    <LinkConsumePage
      path="/registration/verify"
      consume={verifyRegistration}
      returnTo={returnTo}
      title={t('register.pageTitle')}
      invalidCode="link_invalid"
      another={{ to: '/registration', label: t('register.sendNewLink') }}
      events={events}
    />
  );
};

VerifyLinkPage.propTypes = {
  returnTo: returnToShape.isRequired,
  events: PropTypes.shape({ emit: PropTypes.func.isRequired }).isRequired,
};

export default VerifyLinkPage;
