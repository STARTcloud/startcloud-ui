import { useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import AuthShell from '../../../components/common/AuthShell';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import PasswordField from '../../../components/common/PasswordField';
import ProblemAlert from '../../../components/common/ProblemAlert';
import { useFormRules } from '../../../hooks/useFormRules';
import { useProblemReporter } from '../../../hooks/useProblemReporter';
import { sessionStateShape } from '../../../hooks/useSession';
import { followNext } from '../../../lib/next';
import { passwordReset } from '../../../lib/signin';
import { passwordMinimum, returnToShape } from '../../../utils/auth';
import { useSignedInRedirect } from '../useSignedInRedirect';

const SCHEMA = { required: ['password'], properties: { password: { type: 'string' } } };
const LABELS = { password: 'auth:reset.newPassword' };
const INVALID = { code: 'reset_invalid', status: 403, wait: 0, since: 0 };

const readOnce = () => {
  const params = new URLSearchParams(window.location.search);
  return { email: params.get('email') || '', token: params.get('token') || '' };
};

/**
 * `/passwordReset`: reads `email` and `token` from the URL once and replaces
 * the location before drawing, then "Choose a new password" with the reveal
 * and the passphrase generator, the hint from the `password` form of
 * `/api/rules`, the `422` painted inline, and `reset_invalid` replacing the
 * form with the danger alert and "Request a new link"; a person whose
 * adopted session (`account`) is live is sent away.
 */
const PasswordResetPage = ({ account, returnTo }) => {
  const { t } = useTranslation(['auth']);
  const navigate = useNavigate();
  const report = useProblemReporter();
  const signedIn = useSignedInRedirect(account, returnTo);
  const [credentials] = useState(readOnce);
  const [values, setValues] = useState({ password: '' });
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const rules = useFormRules({ formKey: 'password', schema: SCHEMA, values, labels: LABELS });

  useLayoutEffect(() => {
    navigate('/passwordReset', { replace: true });
  }, [navigate]);

  useEffect(() => {
    document.title = t('reset.title');
  }, [t]);

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
  account: sessionStateShape.isRequired,
  returnTo: returnToShape.isRequired,
};

export default PasswordResetPage;
