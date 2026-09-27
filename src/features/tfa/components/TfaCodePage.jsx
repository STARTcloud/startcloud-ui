import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaClock } from 'react-icons/fa6';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import AuthShell, { AuthAlert, AuthSpinner } from '../../../components/common/AuthShell';
import CodeInput from '../../../components/common/CodeInput';
import { useCountdown } from '../../../components/common/Countdown';
import Field from '../../../components/common/Field';
import ProblemAlert, { useWait } from '../../../components/common/ProblemAlert';
import { problemOf, useProblemReporter } from '../../../hooks/useProblemReporter';
import { followNext } from '../../../lib/next';
import { authenticate, isAbort, passkeyRequestOptions, passkeyVerify } from '../../../lib/passkeys';
import { cancelSignIn } from '../../../lib/signin';
import { returnToShape } from '../../../utils/auth';
import { resendTfa, sendTfa, tfaState, verifyTfa } from '../api/tfa';

const CODE_METHODS = ['SMS', 'APP'];

/**
 * The period of a time-based code while the tfa answer names none, the
 * thirty seconds RFC 6238 defaults to; a mismatch shorter than one period
 * never moves the code, so the clock glyph draws from one period up and
 * never below it, the period the answer's `code_period_seconds` when the
 * issuer carries it.
 */
const TOTP_PERIOD_SECONDS = 30;

const periodOf = state =>
  Number.isFinite(state?.code_period_seconds) && state.code_period_seconds > 0
    ? state.code_period_seconds
    : TOTP_PERIOD_SECONDS;

const skewOf = date => {
  const server = Date.parse(date);
  return Number.isNaN(server) ? 0 : Math.round((server - Date.now()) / 1000);
};

const pad = value => String(value).padStart(2, '0');

const clockOf = seconds => {
  const total = Math.abs(seconds);
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
};

const subheadOf = (state, t) => {
  switch (state.method) {
    case 'SMS':
      return t('tfa.subhead.sms', { target: state.target?.masked || '' });
    case 'APP':
      return t('tfa.subhead.app', { label: state.target?.label || '' });
    case 'BACKUP_CODE':
      return t('tfa.subhead.backup');
    case 'PASSKEY':
      return t('tfa.subhead.passkey');
    default:
      return '';
  }
};

const useTfaState = ({ method, onLocked }) => {
  const report = useProblemReporter();
  const [state, setState] = useState(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const [skew, setSkew] = useState(0);
  const [problem, setProblem] = useState(null);

  useEffect(() => {
    let active = true;
    const adopt = answer => {
      if (!active) {
        return;
      }
      setState(answer);
      setLoadedAt(Date.now());
      if (answer.wait_seconds > 0) {
        setProblem({
          code: 'throttled',
          status: 429,
          wait: answer.wait_seconds,
          since: Date.now(),
        });
      }
    };
    const fail = error => {
      if (!active) {
        return;
      }
      if (error.code === 'locked') {
        onLocked();
        return;
      }
      setProblem(report(error));
    };
    tfaState(method)
      .then(answer => {
        if (active) {
          setSkew(skewOf(answer.date));
        }
        adopt(answer.data);
        if (
          CODE_METHODS.includes(answer.data.method) &&
          !answer.data.sent &&
          !answer.data.wait_seconds
        ) {
          return sendTfa().then(adopt);
        }
        return null;
      })
      .catch(fail);
    return () => {
      active = false;
    };
  }, [method, onLocked, report]);

  return { state, loadedAt, skew, problem, setProblem };
};

const ClockSkew = ({ seconds, period }) => {
  const { t } = useTranslation(['auth']);
  if (Math.abs(seconds) < period) {
    return null;
  }
  const label = t('tfa.clockSkew', { time: clockOf(seconds) });
  return (
    <span className="ms-1 text-warning" role="img" title={label} aria-label={label}>
      <FaClock aria-hidden />
    </span>
  );
};

ClockSkew.propTypes = {
  seconds: PropTypes.number.isRequired,
  period: PropTypes.number.isRequired,
};

const ResendButton = ({ after, since, onResend }) => {
  const { t } = useTranslation(['auth']);
  const remaining = useCountdown(after, since);
  return (
    <button
      type="button"
      className="auth-btn auth-btn-secondary auth-btn-block"
      disabled={remaining > 0}
      onClick={onResend}
    >
      {remaining > 0
        ? t('tfa.resendIn', { label: t('tfa.resend'), n: remaining })
        : t('tfa.resend')}
    </button>
  );
};

ResendButton.propTypes = {
  after: PropTypes.number.isRequired,
  since: PropTypes.number.isRequired,
  onResend: PropTypes.func.isRequired,
};

/**
 * `/authenticator`: the code entry for the method the server resolved,
 * the `CodeInput` for SMS and APP (a six-digit paste submits, typed entry
 * only through Sign in and never while the gate is armed), a small clock
 * glyph beside the code label only while the state answer's `Date`
 * header and this browser's clock differ by a code period or more, the
 * answer's `code_period_seconds` else RFC 6238's thirty, its
 * tooltip "Time Mismatch: ~00:00:00" as hours, minutes and seconds,
 * drawn from the first frame and never from a refusal, so a refused code
 * tells nobody anything the public header did not, a text field for a
 * backup code, the passkey button for PASSKEY,
 * Resend under SMS throttled by `resend_after_seconds`, the danger alert
 * from `code` with the gate's countdown, and the foot links to the picker
 * and Cancel.
 */
const TfaCodePage = ({ returnTo, events }) => {
  const { t } = useTranslation(['auth', 'shared']);
  const navigate = useNavigate();
  const location = useLocation();
  const report = useProblemReporter();
  const method = useMemo(
    () => new URLSearchParams(location.search).get('tfa_method') || '',
    [location.search]
  );
  const onLocked = useCallback(
    () => navigate('/authenticator-method', { replace: true }),
    [navigate]
  );
  const { state, loadedAt, skew, problem, setProblem } = useTfaState({ method, onLocked });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);
  const wait = useWait(problem);

  useEffect(() => {
    document.title = t('tfa.title');
  }, [t]);

  const follow = next => followNext({ next, navigate, returnTo, events });

  const fail = error => {
    setBusy(false);
    if (error.code === 'locked') {
      onLocked();
      return;
    }
    setProblem(report(error));
  };

  const verify = value => {
    if (!state || busy || wait > 0 || !value) {
      return;
    }
    setProblem(null);
    setBusy(true);
    verifyTfa({ code: value, tfaMethod: state.method })
      .then(answer => follow(answer?.next))
      .catch(fail);
  };

  const submit = event => {
    event.preventDefault();
    verify(code);
  };

  const resend = () => {
    setProblem(null);
    setResent(false);
    resendTfa()
      .then(() => setResent(true))
      .catch(fail);
  };

  const passkey = () => {
    setProblem(null);
    setBusy(true);
    authenticate({ requestOptions: passkeyRequestOptions, verify: passkeyVerify })
      .then(answer => follow(answer?.next))
      .catch(error => {
        setBusy(false);
        if (!isAbort(error)) {
          setProblem({ ...problemOf(error), code: 'passkey' });
        }
      });
  };

  const cancel = () =>
    cancelSignIn()
      .then(answer => followNext({ next: answer?.next, navigate, returnTo, trusted: true }))
      .catch(fail);

  const codeEntry = state && CODE_METHODS.includes(state.method);
  const codeLabel = (
    <>
      {t('tfa.code')}
      <ClockSkew seconds={skew} period={periodOf(state)} />
    </>
  );

  return (
    <AuthShell title={t('tfa.title')} subtitle={state ? subheadOf(state, t) : ''}>
      {problem ? <ProblemAlert problem={problem} /> : null}
      {resent ? <AuthAlert tone="success">{t('tfa.resent')}</AuthAlert> : null}
      {!state && !problem ? <AuthSpinner label={t('shared:loading')} /> : null}
      {state && state.method !== 'PASSKEY' ? (
        <form className="auth-form" onSubmit={submit} noValidate>
          {codeEntry ? (
            <CodeInput
              id="tfa-code"
              label={codeLabel}
              value={code}
              onChange={setCode}
              onComplete={verify}
              disabled={busy}
            />
          ) : (
            <Field id="tfa-backup" label={t('tfa.backupCode')} className="auth-field">
              {aria => (
                <div className="auth-input-wrap">
                  <input
                    {...aria}
                    name="code"
                    type="text"
                    autoComplete="off"
                    value={code}
                    onChange={event => setCode(event.target.value)}
                  />
                </div>
              )}
            </Field>
          )}
          <button
            type="submit"
            className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
            disabled={busy || wait > 0}
          >
            {t('login.signIn')}
          </button>
          {state.method === 'SMS' ? (
            <ResendButton
              after={state.resend_after_seconds || 0}
              since={loadedAt}
              onResend={resend}
            />
          ) : null}
        </form>
      ) : null}
      {state?.method === 'PASSKEY' ? (
        <button
          type="button"
          className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
          disabled={busy}
          onClick={passkey}
        >
          {t('login.usePasskey')}
        </button>
      ) : null}
      <p className="auth-foot">
        {state?.can_change_method !== false ? (
          <>
            <Link to="/authenticator-method" className="auth-link auth-link-muted">
              {t('tfa.changeMethod')}
            </Link>
            {' · '}
          </>
        ) : null}
        <button type="button" className="auth-link auth-link-muted" onClick={cancel}>
          {t('login.cancel')}
        </button>
      </p>
    </AuthShell>
  );
};

TfaCodePage.propTypes = {
  returnTo: returnToShape.isRequired,
  events: PropTypes.shape({ emit: PropTypes.func.isRequired }).isRequired,
};

export default TfaCodePage;
