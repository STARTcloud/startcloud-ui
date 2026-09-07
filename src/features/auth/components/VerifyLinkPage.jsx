import { useTranslation } from 'react-i18next';

import { returnToShape } from '../../../utils/auth';
import { verifyRegistration } from '../api/registration';

import LinkConsumePage from './LinkConsumePage';

/**
 * `/registration/verify`: consumes the mail's `email` and `token` through
 * `POST /registration/verify` and follows `next` into the onboarding
 * chain; the invalid state offers "Send a new link".
 */
const VerifyLinkPage = ({ returnTo }) => {
  const { t } = useTranslation(['auth']);
  return (
    <LinkConsumePage
      path="/registration/verify"
      consume={verifyRegistration}
      returnTo={returnTo}
      title={t('register.pageTitle')}
      invalidCode="link_invalid"
      another={{ to: '/registration', label: t('register.sendNewLink') }}
    />
  );
};

VerifyLinkPage.propTypes = {
  returnTo: returnToShape.isRequired,
};

export default VerifyLinkPage;
