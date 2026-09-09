import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import AuthShell, { AuthAlert, AuthSpinner, InboxIcon } from '../../../components/common/AuthShell';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import ProblemAlert, { useWait } from '../../../components/common/ProblemAlert';
import { formRulesShape, useFormRules } from '../../../hooks/useFormRules';
import { problemShape, useProblemReporter } from '../../../hooks/useProblemReporter';
import { returnToShape } from '../../../utils/auth';
import { registration, resendRegistration } from '../api/registration';
import { useMethods } from '../useMethods';
import { useSignedInRedirect } from '../useSignedInRedirect';

import ProviderButtons from './ProviderButtons';

const SCHEMA = { required: ['email'], properties: { email: { type: 'string' } } };
const LABELS = { email: 'auth:register.email' };

const providerMethods = answer =>
  (answer?.methods || []).filter(method => method.enabled && method.id.startsWith('oidc-'));

const SentState = ({ email, problem, resent, onResend }) => {
  const { t } = useTranslation(['auth']);
  const wait = useWait(problem);
  return (
    <AuthShell
      title={t('register.sent.title')}
      subtitle={t('register.sent.body', { email })}
      icon={<InboxIcon />}
    >
      {resent ? <AuthAlert tone="success">{t('register.sent.resent')}</AuthAlert> : null}
      {problem ? <ProblemAlert problem={problem} /> : null}
      <p className="auth-note">{t('register.sent.hint')}</p>
      <div className="auth-form">
        <button
          type="button"
          className="auth-btn auth-btn-secondary auth-btn-block"
          disabled={wait > 0}
          onClick={onResend}
        >
          {wait > 0
            ? t('register.sent.resendIn', { label: t('register.sent.resend'), n: wait })
            : t('register.sent.resend')}
        </button>
        <Link to="/login" className="auth-btn auth-btn-secondary auth-btn-block">
          {t('register.sent.return')}
        </Link>
      </div>
    </AuthShell>
  );
};

SentState.propTypes = {
  email: PropTypes.string.isRequired,
  problem: problemShape,
  resent: PropTypes.bool.isRequired,
  onResend: PropTypes.func.isRequired,
};

const EmailForm = ({ values, rules, busy, onChange, onSubmit }) => {
  const { t } = useTranslation(['auth']);
  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <FormErrorSummary errors={rules.summary} />
      <Field
        id={rules.idFor('email')}
        label={t('register.email')}
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
              onChange={onChange}
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
        {t('register.signUpButton')}
      </button>
    </form>
  );
};

EmailForm.propTypes = {
  values: PropTypes.shape({ email: PropTypes.string.isRequired }).isRequired,
  rules: formRulesShape.isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

/**
 * The issuer's form of the registration page: the email field alone with
 * its label, the providers under the divider, "Already have an account?
 * Sign in", and after the `202` the sent state at `/registration?success`
 * with the address in router state, Resend under the server's countdown
 * and "Back to sign in".
 */
const CookieRegister = ({ session, returnTo }) => {
  const { t } = useTranslation(['auth', 'shared']);
  const navigate = useNavigate();
  const location = useLocation();
  const report = useProblemReporter();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const signedIn = useSignedInRedirect(session, returnTo);
  const { methods: answer, loading } = useMethods();
  const [values, setValues] = useState({ email: '' });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const [resent, setResent] = useState(params.has('resend'));
  const rules = useFormRules({ formKey: 'register', schema: SCHEMA, values, labels: LABELS });

  useEffect(() => {
    document.title = t('register.pageTitle');
  }, [t]);

  if (signedIn) {
    return null;
  }

  const sentEmail = params.has('success') ? location.state?.email || '' : '';
  const providers = providerMethods(answer);

  const fail = (error, withRules = null) => {
    setBusy(false);
    setProblem(report(error, withRules));
  };

  const submit = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    setProblem(null);
    setBusy(true);
    registration({ email: values.email })
      .then(() => {
        setBusy(false);
        navigate('/registration?success', { state: { email: values.email } });
      })
      .catch(error => fail(error, rules));
  };

  const resend = () => {
    setProblem(null);
    resendRegistration({ email: sentEmail })
      .then(() => setResent(true))
      .catch(fail);
  };

  if (sentEmail) {
    return <SentState email={sentEmail} problem={problem} resent={resent} onResend={resend} />;
  }

  return (
    <AuthShell title={t('register.headline')} subtitle={t('register.subhead')}>
      {problem ? <ProblemAlert problem={problem} /> : null}
      {loading ? <AuthSpinner label={t('shared:loading')} /> : null}
      {!loading && answer?.local_registration_enabled ? (
        <EmailForm
          values={values}
          rules={rules}
          busy={busy}
          onChange={event => setValues({ email: event.target.value })}
          onSubmit={submit}
        />
      ) : null}
      {!loading && !answer?.local_registration_enabled && providers.length === 0 ? (
        <AuthAlert tone="info">{t('register.closed')}</AuthAlert>
      ) : null}
      {providers.length > 0 ? (
        <>
          {answer?.local_registration_enabled ? (
            <div className="auth-or">{t('login.orSeparator')}</div>
          ) : null}
          <ProviderButtons
            methods={providers}
            defaultProvider={answer?.default_provider || null}
            loading={busy}
            onSelect={provider => session.begin({ method: `oidc-${provider}` })}
          />
        </>
      ) : null}
      <p className="auth-foot">
        {t('register.haveAccount')}{' '}
        <Link to="/login" className="auth-link">
          {t('register.signIn')}
        </Link>
      </p>
    </AuthShell>
  );
};

CookieRegister.propTypes = {
  session: PropTypes.object.isRequired,
  returnTo: returnToShape.isRequired,
};

export default CookieRegister;
