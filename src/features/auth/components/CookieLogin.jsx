import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import AuthShell, { AuthAlert, AuthSpinner, InboxIcon } from '../../../components/common/AuthShell';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import PasswordField from '../../../components/common/PasswordField';
import ProblemAlert, { useWait } from '../../../components/common/ProblemAlert';
import { formRulesShape, useFormRules } from '../../../hooks/useFormRules';
import { problemOf, problemShape, useProblemReporter } from '../../../hooks/useProblemReporter';
import { sessionStateShape } from '../../../hooks/useSession';
import { followNext } from '../../../lib/next';
import {
  authenticate,
  conditionalMediationAvailable,
  isAbort,
  isSupported,
  passkeyRequestOptions,
  passkeyVerify,
} from '../../../lib/passkeys';
import { cancelSignIn, magicLinkRequest } from '../../../lib/signin';
import { authShape, returnToShape, storeLoginMethod } from '../../../utils/auth';
import { NON_BLANK } from '../../../utils/validation';
import { useMethods } from '../useMethods';
import { useSignedInRedirect } from '../useSignedInRedirect';

import ProviderButtons from './ProviderButtons';

const MODES = ['magic_link', 'password'];
const MODE_OF = { 'magic-link': 'magic_link', local: 'password' };
const PASSWORD_SCHEMA = {
  required: ['username', 'password'],
  properties: { username: NON_BLANK, password: NON_BLANK },
};
const MAGIC_SCHEMA = { required: ['email'], properties: { email: NON_BLANK } };
const LABELS = {
  username: 'auth:login.email',
  email: 'auth:login.email',
  password: 'auth:login.password',
};
const SAFE_PATH = /^\/(?![/\\])/;

const enabledMethods = answer => (answer?.methods || []).filter(method => method.enabled);

const availableModes = answer => {
  if (!answer) {
    return MODES;
  }
  return enabledMethods(answer)
    .map(method => MODE_OF[method.id])
    .filter(Boolean);
};

const resolveMode = ({ params, stored, answer }) => {
  const available = availableModes(answer);
  const error = params.get('error') || '';
  const candidates = [
    error.startsWith('magic_link_') ? 'magic_link' : '',
    params.get('login') || '',
    stored,
    answer?.login_mode || '',
  ];
  return candidates.find(mode => available.includes(mode)) || available[0] || '';
};

const providerMethods = (answer, params) => {
  const oidc = enabledMethods(answer).filter(method => method.id.startsWith('oidc-'));
  const narrow = (params.get('oidc_provider') || '').split(',').filter(Boolean);
  if (narrow.length === 0) {
    return oidc;
  }
  return oidc.filter(method => narrow.includes(method.id) || narrow.includes(method.id.slice(5)));
};

const queryNotice = params => {
  const error = params.get('error');
  if (error) {
    return { tone: 'danger', keys: [`errors.${error}`, 'errors.authenticationFailed'] };
  }
  const info = params.get('info');
  if (info) {
    return { tone: 'info', keys: [`info.${info}`, 'errors.authenticationFailed'] };
  }
  if (params.has('stepup')) {
    return { tone: 'info', keys: ['login.stepUp'] };
  }
  if (params.has('logout')) {
    return { tone: 'success', keys: ['login.loggedOut'] };
  }
  if (params.get('reset') === 'complete') {
    return { tone: 'info', keys: ['login.resetComplete'] };
  }
  return null;
};

const passkeyMethod = answer =>
  isSupported() ? enabledMethods(answer).find(method => method.id === 'passkey') : null;

const useConditionalPasskey = ({ enabled, onNext, onError }) => {
  const controller = useRef(null);
  const callbacks = useRef({ onNext, onError });

  useEffect(() => {
    callbacks.current = { onNext, onError };
  });

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let active = true;
    const abort = new AbortController();
    controller.current = abort;
    conditionalMediationAvailable().then(available => {
      if (!available || !active) {
        return;
      }
      authenticate({
        requestOptions: passkeyRequestOptions,
        verify: passkeyVerify,
        conditional: true,
        signal: abort.signal,
      })
        .then(answer => {
          if (active) {
            callbacks.current.onNext(answer?.next);
          }
        })
        .catch(error => {
          if (active && !isAbort(error)) {
            callbacks.current.onError(error);
          }
        });
    });
    return () => {
      active = false;
      abort.abort();
      controller.current = null;
    };
  }, [enabled]);

  return useCallback(() => controller.current?.abort(), []);
};

const PolicyLinks = ({ policies }) => (
  <div className="auth-policy">
    {policies.map((policy, index) => (
      <span key={policy.name}>
        {index > 0 ? ' · ' : ''}
        {SAFE_PATH.test(policy.url) ? (
          <Link to={policy.url} className="auth-link">
            {policy.label}
          </Link>
        ) : (
          <a href={policy.url} className="auth-link">
            {policy.label}
          </a>
        )}
      </span>
    ))}
  </div>
);

PolicyLinks.propTypes = {
  policies: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      url: PropTypes.string.isRequired,
    })
  ).isRequired,
};

const LoginForm = ({ mode, values, rules, revealed, wait, conditional, handlers, formRef }) => {
  const { t } = useTranslation(['auth']);
  const password = mode === 'password';
  const address = password ? 'username' : 'email';
  return (
    <form className="auth-form" onSubmit={handlers.onSubmit} noValidate ref={formRef}>
      <FormErrorSummary errors={rules.summary} />
      <Field
        id={rules.idFor(address)}
        label={t('login.email')}
        error={rules.errors[address] || ''}
        className="auth-field"
      >
        {aria => (
          <div className="auth-input-wrap">
            <input
              {...aria}
              name="username"
              type="email"
              autoComplete={conditional ? 'username webauthn' : 'username'}
              value={values.username}
              onChange={handlers.onChange}
              onBlur={() => rules.onBlur(address)}
            />
          </div>
        )}
      </Field>
      {password ? (
        <PasswordField
          id={rules.idFor('password')}
          name="password"
          label={t('login.password')}
          value={values.password}
          onChange={handlers.onChange}
          onBlur={() => rules.onBlur('password')}
          error={rules.errors.password || ''}
          autoComplete="current-password"
          revealed={revealed}
          onToggleReveal={handlers.onToggleReveal}
        />
      ) : null}
      <div className="auth-row">
        <label className="auth-check">
          <input
            type="checkbox"
            name="remember"
            checked={values.remember}
            onChange={handlers.onChange}
          />
          <span>{t('login.keepSignedIn')}</span>
        </label>
        {password ? (
          <Link to="/passwordRecovery" className="auth-link auth-link-muted">
            {t('login.forgotPassword')}
          </Link>
        ) : null}
      </div>
      {handlers.ready ? (
        <>
          <button
            type="submit"
            className={`auth-btn auth-btn-primary auth-btn-block${handlers.busy ? ' is-loading' : ''}`}
            disabled={handlers.busy || wait > 0}
          >
            {password ? t('login.signIn') : t('login.continueWithEmail')}
          </button>
          {handlers.onPasskey ? (
            <button
              type="button"
              className="auth-btn auth-btn-secondary auth-btn-block"
              disabled={handlers.busy}
              onClick={handlers.onPasskey}
            >
              {t('login.usePasskey')}
            </button>
          ) : null}
        </>
      ) : (
        <AuthSpinner label={t('shared:loading')} />
      )}
    </form>
  );
};

LoginForm.propTypes = {
  mode: PropTypes.string.isRequired,
  values: PropTypes.shape({
    username: PropTypes.string.isRequired,
    password: PropTypes.string.isRequired,
    remember: PropTypes.bool.isRequired,
  }).isRequired,
  rules: formRulesShape.isRequired,
  revealed: PropTypes.bool.isRequired,
  wait: PropTypes.number.isRequired,
  conditional: PropTypes.bool.isRequired,
  handlers: PropTypes.shape({
    onSubmit: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    onToggleReveal: PropTypes.func.isRequired,
    onPasskey: PropTypes.func,
    ready: PropTypes.bool.isRequired,
    busy: PropTypes.bool.isRequired,
  }).isRequired,
  formRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
};

const LoginExtras = ({ answer, providers, mode, busy, onSwitch, onCancel, session, appName }) => {
  const { t } = useTranslation(['auth']);
  const otherMode = MODES.find(candidate => candidate !== mode);
  const canSwitch = Boolean(mode) && availableModes(answer).includes(otherMode);
  const cancel = Boolean(answer?.cancel);
  return (
    <>
      {providers.length > 0 ? (
        <>
          {mode ? <div className="auth-or">{t('login.orSeparator')}</div> : null}
          <ProviderButtons
            methods={providers}
            defaultProvider={answer?.default_provider || null}
            loading={busy}
            onSelect={provider => session.begin({ method: `oidc-${provider}` })}
          />
        </>
      ) : null}
      {canSwitch || cancel ? (
        <div className="auth-links">
          {canSwitch ? (
            <button type="button" className="auth-link" onClick={() => onSwitch(otherMode)}>
              {otherMode === 'password' ? t('login.usePassword') : t('login.useEmailLink')}
            </button>
          ) : null}
          {cancel ? (
            <button type="button" className="auth-link auth-link-muted" onClick={onCancel}>
              {t('login.cancel')}
            </button>
          ) : null}
        </div>
      ) : null}
      {answer?.local_registration_enabled ? (
        <p className="auth-foot">
          {t('login.newHere', { app: appName })}{' '}
          <Link to="/registration" className="auth-link">
            {t('login.createAccount')}
          </Link>
        </p>
      ) : null}
      {answer?.policies?.length > 0 ? <PolicyLinks policies={answer.policies} /> : null}
    </>
  );
};

LoginExtras.propTypes = {
  answer: PropTypes.object,
  providers: PropTypes.arrayOf(PropTypes.object).isRequired,
  mode: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onSwitch: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  session: PropTypes.object.isRequired,
  appName: PropTypes.string.isRequired,
};

const SentState = ({ email, answer, problem, resent, onResend, onDifferent }) => {
  const { t } = useTranslation(['auth']);
  const wait = useWait(problem);
  const hedged = answer ? !answer.local_registration_enabled : false;
  return (
    <AuthShell
      title={t('login.sent.title')}
      subtitle={t(hedged ? 'login.sent.bodyHedged' : 'login.sent.body', { email })}
      icon={<InboxIcon />}
    >
      {resent ? <AuthAlert tone="success">{t('login.sent.resent')}</AuthAlert> : null}
      {problem ? <ProblemAlert problem={problem} /> : null}
      <p className="auth-note">
        {answer
          ? t('login.sent.validFor', { minutes: answer.magic_link_ttl_minutes })
          : t('login.sent.expires')}
      </p>
      <div className="auth-form">
        <button
          type="button"
          className="auth-btn auth-btn-secondary auth-btn-block"
          disabled={wait > 0}
          onClick={onResend}
        >
          {wait > 0
            ? t('login.sent.resendIn', { label: t('login.sent.resend'), n: wait })
            : t('login.sent.resend')}
        </button>
        <button
          type="button"
          className="auth-btn auth-btn-secondary auth-btn-block"
          onClick={onDifferent}
        >
          {t('login.sent.differentEmail')}
        </button>
      </div>
    </AuthShell>
  );
};

SentState.propTypes = {
  email: PropTypes.string.isRequired,
  answer: PropTypes.object,
  problem: problemShape,
  resent: PropTypes.bool.isRequired,
  onResend: PropTypes.func.isRequired,
  onDifferent: PropTypes.func.isRequired,
};

const useLoginActions = ({ session, returnTo, values, rules, mode, setProblem, setBusy }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const report = useProblemReporter();

  const follow = useCallback(
    next => followNext({ next, navigate, returnTo }),
    [navigate, returnTo]
  );

  const fail = useCallback(
    (error, withRules = null) => {
      setBusy(false);
      setProblem(report(error, withRules));
    },
    [report, setBusy, setProblem]
  );

  const submit = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    setProblem(null);
    setBusy(true);
    if (mode === 'password') {
      session
        .login(values.username, values.password, values.remember)
        .then(follow)
        .catch(error => fail(error, rules));
      return;
    }
    magicLinkRequest({ email: values.username, remember: values.remember, resend: false })
      .then(() => {
        setBusy(false);
        navigate('/login?sent', { state: { email: values.username } });
      })
      .catch(error => fail(error, rules));
  };

  const resend = () => {
    const email = location.state?.email || '';
    setProblem(null);
    return magicLinkRequest({ email, remember: values.remember, resend: true })
      .then(() => true)
      .catch(error => {
        fail(error);
        return false;
      });
  };

  const cancel = () =>
    cancelSignIn()
      .then(answer => followNext({ next: answer?.next, navigate, returnTo, trusted: true }))
      .catch(fail);

  const passkey = () =>
    authenticate({ requestOptions: passkeyRequestOptions, verify: passkeyVerify })
      .then(answer => follow(answer?.next))
      .catch(error => {
        if (!isAbort(error)) {
          setProblem({ ...problemOf(error), code: 'passkey' });
        }
      });

  return { follow, fail, submit, resend, cancel, passkey };
};

/**
 * The issuer's form of the sign-in page: two modes, `magic_link` and
 * `password`, the mode from `?login=` for one visit, then the stored
 * `login_method`, then the methods answer's `login_mode`, then the first
 * enabled method; the shared email field, the password field and "Forgot
 * password?" in password mode, "Keep me logged in" in both; the passkey
 * button and the conditional prompt while `passkey` is enabled; one
 * provider button per `oidc-` method; the sent state at `/login?sent` with
 * the address in router state; the query alerts; the foot with "Create an
 * account", the policy links and Cancel while a request is parked. The
 * heading and the field draw at once and the button block waits on the
 * methods answer; a person whose adopted session (`account`) is live is
 * sent away.
 */
const CookieLogin = ({ session, account, returnTo, auth, appName }) => {
  const { t } = useTranslation(['auth', 'shared']);
  const navigate = useNavigate();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const signedIn = useSignedInRedirect(account, returnTo);
  const { methods: answer, loading } = useMethods();
  const [values, setValues] = useState({ username: '', password: '', remember: false });
  const [chosenMode, setChosenMode] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const [resent, setResent] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const form = useRef(null);

  const stored = localStorage.getItem(auth.loginMethodKey) || '';
  const resolved = resolveMode({ params, stored, answer });
  const mode = availableModes(answer).includes(chosenMode) ? chosenMode : resolved;
  const ruleValues = useMemo(
    () => (mode === 'password' ? values : { ...values, email: values.username }),
    [mode, values]
  );
  const rules = useFormRules({
    formKey: 'login',
    schema: mode === 'password' ? PASSWORD_SCHEMA : MAGIC_SCHEMA,
    values: ruleValues,
    labels: LABELS,
  });
  const wait = useWait(problem);
  const actions = useLoginActions({ session, returnTo, values, rules, mode, setProblem, setBusy });
  const passkey = passkeyMethod(answer);
  const conditional = Boolean(passkey?.conditional_ui);
  const abortConditional = useConditionalPasskey({
    enabled: conditional && !signedIn,
    onNext: actions.follow,
    onError: error => setProblem({ ...problemOf(error), code: 'passkey' }),
  });

  useEffect(() => {
    document.title = t('login.pageTitle');
  }, [t]);

  useEffect(() => {
    const from = returnTo.fromParams(params);
    if (from) {
      returnTo.remember(from);
    }
  }, [params, returnTo]);

  useEffect(() => {
    if (!focusRequest) {
      return;
    }
    const inputs = ['username', 'password']
      .map(name => form.current?.querySelector(`input[name="${name}"]`))
      .filter(Boolean);
    inputs.find(input => !input.value)?.focus();
  }, [focusRequest]);

  if (signedIn) {
    return null;
  }

  const sentEmail = params.has('sent') ? location.state?.email || '' : '';
  if (sentEmail) {
    return (
      <SentState
        email={sentEmail}
        answer={answer}
        problem={problem}
        resent={resent}
        onResend={() => actions.resend().then(ok => setResent(ok))}
        onDifferent={() => navigate('/login')}
      />
    );
  }

  const notice = problem ? null : queryNotice(params);
  const providers = providerMethods(answer, params);
  const handleChange = event => {
    const { name, value, type, checked } = event.target;
    setValues(previous => ({ ...previous, [name]: type === 'checkbox' ? checked : value }));
  };
  const handlers = {
    onSubmit: actions.submit,
    onChange: handleChange,
    onToggleReveal: () => setRevealed(visible => !visible),
    onPasskey: passkey
      ? () => {
          abortConditional();
          actions.passkey();
        }
      : null,
    ready: !loading,
    busy,
  };

  return (
    <AuthShell title={t('login.headline', { app: appName })}>
      {problem ? <ProblemAlert problem={problem} /> : null}
      {notice ? <AuthAlert tone={notice.tone}>{t(notice.keys)}</AuthAlert> : null}
      {mode ? (
        <LoginForm
          mode={mode}
          values={values}
          rules={rules}
          revealed={revealed}
          wait={wait}
          conditional={conditional}
          handlers={handlers}
          formRef={form}
        />
      ) : null}
      {!loading && !mode && providers.length === 0 ? (
        <AuthAlert tone="info">{t('login.noMethods')}</AuthAlert>
      ) : null}
      <LoginExtras
        answer={answer}
        providers={providers}
        mode={mode}
        busy={busy}
        onSwitch={next => {
          setChosenMode(next);
          storeLoginMethod(auth.loginMethodKey, next);
          setProblem(null);
          setFocusRequest(count => count + 1);
        }}
        onCancel={actions.cancel}
        session={session}
        appName={appName}
      />
    </AuthShell>
  );
};

CookieLogin.propTypes = {
  session: PropTypes.object.isRequired,
  account: sessionStateShape.isRequired,
  returnTo: returnToShape.isRequired,
  auth: authShape.isRequired,
  appName: PropTypes.string.isRequired,
};

export default CookieLogin;
