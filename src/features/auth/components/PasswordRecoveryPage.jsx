import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import { useFormRules } from '../../../hooks/useFormRules';
import { returnToShape } from '../../../utils/auth';
import { passwordRecovery } from '../api/signin';
import { problemShape, useProblemReporter } from '../problem';
import { useMethods } from '../useMethods';
import { useSignedInRedirect } from '../useSignedInRedirect';

import AuthShell, { InboxIcon } from './AuthShell';
import ProblemAlert, { useWait } from './ProblemAlert';

const SCHEMA = { required: ['email'], properties: { email: { type: 'string' } } };
const LABELS = { email: 'auth:login.email' };

const SentState = ({ email, minutes, problem, onResend }) => {
  const { t } = useTranslation(['auth']);
  const wait = useWait(problem);
  return (
    <AuthShell
      title={t('recovery.sent.title')}
      subtitle={t('recovery.sent.body', { email })}
      icon={<InboxIcon />}
    >
      {problem ? <ProblemAlert problem={problem} /> : null}
      {minutes ? <p className="auth-note">{t('recovery.sent.ttl', { minutes })}</p> : null}
      <div className="auth-form">
        <button
          type="button"
          className="auth-btn auth-btn-secondary auth-btn-block"
          disabled={wait > 0}
          onClick={onResend}
        >
          {wait > 0
            ? t('recovery.sent.resendIn', { label: t('recovery.sent.resend'), n: wait })
            : t('recovery.sent.resend')}
        </button>
        <Link to="/login" className="auth-btn auth-btn-secondary auth-btn-block">
          {t('recovery.returnToSite')}
        </Link>
      </div>
    </AuthShell>
  );
};

SentState.propTypes = {
  email: PropTypes.string.isRequired,
  minutes: PropTypes.number,
  problem: problemShape,
  onResend: PropTypes.func.isRequired,
};

/**
 * `/passwordRecovery`: the email field and Continue, then the sent state at
 * `?success` with the address in router state, the reset link's lifetime
 * from the methods answer, Resend under the server's countdown and "Back
 * to sign in".
 */
const PasswordRecoveryPage = ({ session, returnTo }) => {
  const { t } = useTranslation(['auth']);
  const navigate = useNavigate();
  const location = useLocation();
  const report = useProblemReporter();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const signedIn = useSignedInRedirect(session, returnTo);
  const { methods: answer } = useMethods();
  const [values, setValues] = useState({ email: '' });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const rules = useFormRules({ formKey: 'recovery', schema: SCHEMA, values, labels: LABELS });

  useEffect(() => {
    document.title = t('recovery.title');
  }, [t]);

  if (signedIn) {
    return null;
  }

  const sentEmail = params.has('success') ? location.state?.email || '' : '';

  const send = email =>
    passwordRecovery({ email }).catch(error => {
      setBusy(false);
      setProblem(report(error, rules));
      throw error;
    });

  const submit = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    setProblem(null);
    setBusy(true);
    send(values.email)
      .then(() => {
        setBusy(false);
        navigate('/passwordRecovery?success', { state: { email: values.email } });
      })
      .catch(() => null);
  };

  if (sentEmail) {
    return (
      <SentState
        email={sentEmail}
        minutes={answer?.reset_link_ttl_minutes}
        problem={problem}
        onResend={() => {
          setProblem(null);
          send(sentEmail).catch(() => null);
        }}
      />
    );
  }

  return (
    <AuthShell title={t('recovery.title')} subtitle={t('recovery.subhead')}>
      {problem ? <ProblemAlert problem={problem} /> : null}
      <form className="auth-form" onSubmit={submit} noValidate>
        <FormErrorSummary errors={rules.summary} />
        <Field
          id={rules.idFor('email')}
          label={t('login.email')}
          error={rules.errors.email || ''}
          className="auth-field"
        >
          {aria => (
            <div className="auth-input-wrap">
              <input
                {...aria}
                name="email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={event => setValues({ email: event.target.value })}
                onBlur={() => rules.onBlur('email')}
              />
            </div>
          )}
        </Field>
        <button
          type="submit"
          className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
          disabled={busy}
        >
          {t('reset.continue')}
        </button>
      </form>
      <p className="auth-foot">
        {t('recovery.remembered')}{' '}
        <Link to="/login" className="auth-link">
          {t('recovery.signIn')}
        </Link>
      </p>
    </AuthShell>
  );
};

PasswordRecoveryPage.propTypes = {
  session: PropTypes.object.isRequired,
  returnTo: returnToShape.isRequired,
};

export default PasswordRecoveryPage;
