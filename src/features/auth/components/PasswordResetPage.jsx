import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import FormErrorSummary from '../../../components/common/FormErrorSummary';
import PasswordField from '../../../components/common/PasswordField';
import { useFormRules } from '../../../hooks/useFormRules';
import { rules as hostRules } from '../../../lib/runtime';
import { returnToShape } from '../../../utils/auth';
import { passwordReset } from '../api/signin';
import { followNext } from '../next';
import { useProblemReporter } from '../problem';
import { useSignedInRedirect } from '../useSignedInRedirect';

import AuthShell from './AuthShell';
import ProblemAlert from './ProblemAlert';

const SCHEMA = { required: ['password'], properties: { password: { type: 'string' } } };
const LABELS = { password: 'auth:reset.newPassword' };
const DEFAULT_MINIMUM = 15;
const INVALID = { code: 'reset_invalid', status: 403, wait: 0, since: 0 };

const readOnce = () => {
  const params = new URLSearchParams(window.location.search);
  return { email: params.get('email') || '', token: params.get('token') || '' };
};

/**
 * The minimum length the issuer publishes for a password, 15 by default.
 * @returns {number}
 */
export const passwordMinimum = () =>
  hostRules?.forms?.password?.properties?.password?.minLength || DEFAULT_MINIMUM;

/**
 * `/passwordReset`: reads `email` and `token` from the URL once and replaces
 * the location before drawing, then "Choose a new password" with the reveal
 * and the passphrase generator, the hint from the `password` form of
 * `/api/rules`, the `422` painted inline, and `reset_invalid` replacing the
 * form with the danger alert and "Request a new link".
 */
const PasswordResetPage = ({ session, returnTo }) => {
  const { t } = useTranslation(['auth']);
  const navigate = useNavigate();
  const report = useProblemReporter();
  const signedIn = useSignedInRedirect(session, returnTo);
  const [credentials] = useState(readOnce);
  const [values, setValues] = useState({ password: '' });
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const rules = useFormRules({ formKey: 'password', schema: SCHEMA, values, labels: LABELS });

  useEffect(() => {
    document.title = t('reset.title');
    navigate('/passwordReset', { replace: true });
  }, [navigate, t]);

  if (signedIn) {
    return null;
  }

  const invalid = !credentials.token || problem?.code === 'reset_invalid';

  const submit = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    setProblem(null);
    setBusy(true);
    passwordReset({ ...credentials, password: values.password })
      .then(answer => followNext({ next: answer?.next, navigate, returnTo }))
      .catch(error => {
        setBusy(false);
        setProblem(report(error, rules));
      });
  };

  if (invalid) {
    return (
      <AuthShell title={t('reset.title')}>
        <ProblemAlert problem={problem || INVALID} />
        <Link to="/passwordRecovery" className="auth-btn auth-btn-primary auth-btn-block">
          {t('login.magic.requestAnother')}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('reset.title')} subtitle={t('reset.subhead', { min: passwordMinimum() })}>
      {problem ? <ProblemAlert problem={problem} /> : null}
      <form className="auth-form" onSubmit={submit} noValidate>
        <FormErrorSummary errors={rules.summary} />
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={credentials.email}
          readOnly
          hidden
        />
        <PasswordField
          id={rules.idFor('password')}
          name="password"
          label={t('reset.newPassword')}
          value={values.password}
          onChange={event => setValues({ password: event.target.value })}
          onBlur={() => rules.onBlur('password')}
          error={rules.errors.password || ''}
          revealed={revealed}
          onToggleReveal={() => setRevealed(visible => !visible)}
          onGenerate={phrase => {
            setValues({ password: phrase });
            setRevealed(true);
          }}
        />
        <button
          type="submit"
          className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
          disabled={busy}
        >
          {t('reset.continue')}
        </button>
      </form>
    </AuthShell>
  );
};

PasswordResetPage.propTypes = {
  session: PropTypes.object.isRequired,
  returnTo: returnToShape.isRequired,
};

export default PasswordResetPage;
