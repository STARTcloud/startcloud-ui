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
import {
  authenticate,
  isAbort,
  passkeyCodeOf,
  passkeyRequestOptions,
  passkeyVerify,
} from '../../../lib/passkeys';
import { cancelSignIn } from '../../../lib/signin';
import { returnToShape } from '../../../utils/auth';
import { resendTfa, sendEmailTfa, sendTfa, tfaState, verifyEmailTfa, verifyTfa } from '../api/tfa';
import { membersOf, queryProblemOf } from '../utils/methods';

const EMAIL = 'EMAIL';
const SENT_METHODS = ['SMS', 'APP'];
const ENTRY_METHODS = ['SMS', 'APP', EMAIL];
const RESEND_METHODS = ['SMS', EMAIL];
const RESEND_WAIT = 'email_code_send';
const EMAILED = { method: EMAIL, sent: true };
const METHOD_PAGE = '/authenticator-method';

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
    case EMAIL:
      return state.target?.masked ? t('tfa.subhead.email', { target: state.target.masked }) : '';
    default:
      return '';
  }
};

const sendOwed = data => {
  if (data.sent || data.wait_seconds) {
    return null;
  }
  if (data.method === EMAIL) {
    return sendEmailTfa;
  }
  return SENT_METHODS.includes(data.method) ? sendTfa : null;
};

const useTfaState = ({ method, search, onLocked, onHandOver }) => {
  const report = useProblemReporter();
  const [state, setState] = useState(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const [skew, setSkew] = useState(0);
  const [problem, setProblem] = useState(() => queryProblemOf(search));

  const adopt = useCallback(answer => {
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
  }, []);

  const fail = useCallback(
    error => {
      if (error.code === 'locked') {
        onLocked();
        return;
      }
      const members = membersOf(error);
      if (members) {
        onHandOver(members, problemOf(error));
        return;
      }
      if (error.code === RESEND_WAIT) {
        const refusal = problemOf(error);
        setState(held => ({ ...(held || EMAILED), resend_after_seconds: refusal.wait }));
        setLoadedAt(refusal.since);
        setProblem({ ...refusal, wait: 0 });
        return;
      }
      setProblem(report(error));
    },
    [onHandOver, onLocked, report]
  );

  useEffect(() => {
    let active = true;
    const live = handler => value => (active ? handler(value) : null);
    const read = answer => {
      const send = sendOwed(answer.data);
      setSkew(skewOf(answer.date));
      adopt(answer.data);
      return send ? send().then(live(adopt)) : null;
    };
    const opening = method === EMAIL ? sendEmailTfa() : tfaState(method);
    opening.then(live(method === EMAIL ? adopt : read)).catch(live(fail));
    return () => {
      active = false;
    };
  }, [adopt, fail, method]);

  return { state, loadedAt, skew, problem, setProblem, adopt, fail };
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

const CodeEntry = ({ boxes, label, code, busy, onChange, onComplete }) => {
  const { t } = useTranslation(['auth']);
  if (boxes) {
    return (
      <CodeInput
        id="tfa-code"
        label={label}
        value={code}
        onChange={onChange}
        onComplete={onComplete}
        disabled={busy}
      />
    );
  }
  return (
    <Field id="tfa-backup" label={t('tfa.backupCode')} className="auth-field">
      {aria => (
        <div className="auth-input-wrap">
          <input
            {...aria}
            name="code"
            type="text"
            autoComplete="off"
            value={code}
            onChange={event => onChange(event.target.value)}
          />
        </div>
      )}
    </Field>
  );
};

CodeEntry.propTypes = {
  boxes: PropTypes.bool.isRequired,
  label: PropTypes.node.isRequired,
  code: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onComplete: PropTypes.func.isRequired,
};

/**
 * `/authenticator`: the code entry for the method the server resolved,
 * the `CodeInput` for SMS, APP and the emailed code (a six-digit paste
 * submits, typed entry only through Sign in and never while the gate is
 * armed), a small clock
 * glyph beside the code label only while the state answer's `Date`
 * header and this browser's clock differ by a code period or more, the
 * answer's `code_period_seconds` else RFC 6238's thirty, its
 * tooltip "Time Mismatch: ~00:00:00" as hours, minutes and seconds,
 * drawn from the first frame and never from a refusal, so a refused code
 * tells nobody anything the public header did not, a text field for a
 * backup code, the passkey button for PASSKEY,
 * Resend under SMS and the emailed code throttled by
 * `resend_after_seconds`, the danger alert from `code` or from
 * `?error=<code>` with the gate's countdown, and the foot links to the
 * picker, always drawn, and Cancel. The emailed code, `tfa_method=EMAIL`,
 * is sent by `POST /api/auth/tfa/email/send` as the page opens, its
 * answer the page's state with the masked address, verified at
 * `POST /api/auth/tfa/email/verify` and sent again through the send
 * route, whose `429` `email_code_send` restarts the Resend countdown from
 * its `wait_seconds` and blocks no entry. A `send_failed` or
 * `sms_unavailable` refusal moves to the picker with the methods it
 * carried, so the person chooses another with no further request.
 */
const TfaCodePage = ({ returnTo, events }) => {
  const { t } = useTranslation(['auth', 'shared']);
  const navigate = useNavigate();
  const location = useLocation();
  const method = useMemo(
    () => new URLSearchParams(location.search).get('tfa_method') || '',
    [location.search]
  );
  const onLocked = useCallback(() => navigate(METHOD_PAGE, { replace: true }), [navigate]);
  const onHandOver = useCallback(
    (methods, refusal) =>
      navigate(METHOD_PAGE, { replace: true, state: { methods, problem: refusal } }),
    [navigate]
  );
  const { state, loadedAt, skew, problem, setProblem, adopt, fail } = useTfaState({
    method,
    search: location.search,
    onLocked,
    onHandOver,
  });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);
  const wait = useWait(problem);
  const emailed = state?.method === EMAIL;

  useEffect(() => {
    document.title = t('tfa.title');
  }, [t]);

  const follow = next => followNext({ next, navigate, returnTo, events });

  const failed = error => {
    setBusy(false);
    fail(error);
  };

  const verify = value => {
    if (!state || busy || wait > 0 || !value) {
      return;
    }
    setProblem(null);
    setBusy(true);
    const check = emailed
      ? verifyEmailTfa({ code: value })
      : verifyTfa({ code: value, tfaMethod: state.method });
    check.then(answer => follow(answer?.next)).catch(failed);
  };

  const submit = event => {
    event.preventDefault();
    verify(code);
  };

  const resend = () => {
    setProblem(null);
    setResent(false);
    const again = emailed ? sendEmailTfa().then(adopt) : resendTfa();
    again.then(() => setResent(true)).catch(failed);
  };

  const passkey = () => {
    setProblem(null);
    setBusy(true);
    authenticate({ requestOptions: passkeyRequestOptions, verify: passkeyVerify })
      .then(answer => follow(answer?.next))
      .catch(error => {
        setBusy(false);
        if (!isAbort(error)) {
          setProblem({ ...problemOf(error), code: passkeyCodeOf(error) });
        }
      });
  };

  const cancel = () =>
    cancelSignIn()
      .then(answer => followNext({ next: answer?.next, navigate, returnTo, trusted: true }))
      .catch(failed);

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
          <CodeEntry
            boxes={ENTRY_METHODS.includes(state.method)}
            label={codeLabel}
            code={code}
            busy={busy}
            onChange={setCode}
            onComplete={verify}
          />
          <button
            type="submit"
            className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
            disabled={busy || wait > 0}
          >
            {t('login.signIn')}
          </button>
          {RESEND_METHODS.includes(state.method) ? (
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
        <Link to={METHOD_PAGE} className="auth-link auth-link-muted">
          {t('tfa.changeMethod')}
        </Link>
        {' · '}
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
