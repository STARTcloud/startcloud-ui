import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { returnToShape } from '../../../utils/auth';
import { bootstrapConsume } from '../api/bootstrap';

import LinkConsumePage from './LinkConsumePage';

const readOnce = () => {
  const params = new URLSearchParams(window.location.search);
  const body = {
    email: params.get('email') || '',
    token: params.get('token') || '',
    return: params.get('return') || '',
  };
  return { body, complete: Boolean(body.email && body.token) };
};

/**
 * `/login/bootstrap`: consumes the seeded link's `email`, `token` and
 * `return` through `POST /login/bootstrap` and follows `next` with the bus
 * handed along, so `login` is emitted where the page stays in-router; the
 * invalid state offers "Sign in another way".
 */
const BootstrapLoginPage = ({ returnTo, events }) => {
  const { t } = useTranslation(['auth']);
  return (
    <LinkConsumePage
      path="/login/bootstrap"
      read={readOnce}
      consume={bootstrapConsume}
      returnTo={returnTo}
      title={t('login.bootstrap.title')}
      invalidCode="bootstrap_invalid"
      another={{ to: '/login', label: t('login.bootstrap.anotherWay') }}
      events={events}
    />
  );
};

BootstrapLoginPage.propTypes = {
  returnTo: returnToShape.isRequired,
  events: PropTypes.shape({ emit: PropTypes.func.isRequired }).isRequired,
};

export default BootstrapLoginPage;
