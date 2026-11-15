import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthAlert } from '../../../components/common/AuthShell';
import CodeInput from '../../../components/common/CodeInput';
import { useCountdown } from '../../../components/common/Countdown';
import { returnToShape } from '../../../utils/auth';
import { resendEmailCode, verifyEmailCode } from '../api/onboarding';
import { useOnboarding, useStepAction } from '../useOnboarding';

import OnboardingFrame from './OnboardingFrame';

const NONE = { after: 0, at: 0 };

const ResendCode = ({ after, since, busy, onResend }) => {
  const { t } = useTranslation(['auth']);
  const remaining = useCountdown(after, since);
  return (
    <button
      type="button"
      className="auth-btn auth-btn-secondary auth-btn-block"
      disabled={remaining > 0 || busy}
      onClick={onResend}
    >
      {remaining > 0
        ? t('onboarding.phone.resendIn', { n: remaining })
        : t('onboarding.phone.resend')}
    </button>
  );
};

ResendCode.propTypes = {
  after: PropTypes.number.isRequired,
  since: PropTypes.number.isRequired,
  busy: PropTypes.bool.isRequired,
  onResend: PropTypes.func.isRequired,
};

/**
 * `/complete-onboarding/email-verification`: the send route,
 * `POST /complete-onboarding/email-verification/resend`, posted once as
 * the page is drawn and once per press of Resend, each `200` restarting
 * the Resend countdown from its `resend_after_seconds` and the moment it
 * arrived, whatever the number; then "A verification code has been sent
 * to {{email}}", the `CodeInput` and Verify. A send that fails draws its
 * own message, `503` `send_failed` among them, withdraws the code entry
 * and the subtitle until a send answers `200`, and leaves Resend live;
 * the notice that a code was sent again draws only after a press of
 * Resend; a `401` sends the visitor to `/login?error=session_expired`.
 */
const EmailCodeStep = ({ returnTo, events }) => {
  const { t } = useTranslation(['auth']);
  const { state } = useOnboarding();
  const { run, busy, problem } = useStepAction(returnTo, events);
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(NONE);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    document.title = t('onboarding.email.title');
  }, [t]);

  const send = useCallback(
    (onSent = null) => {
      const withdraw = error => {
        setSent(NONE);
        throw error;
      };
      return run(resendEmailCode().catch(withdraw), null, answer => {
        setSent({ after: Number(answer?.resend_after_seconds) || 0, at: Date.now() });
        if (onSent) {
          onSent();
        }
      });
    },
    [run]
  );

  useEffect(() => {
    send();
  }, [send]);

  const verify = value => {
    if (sent.at && value) {
      run(verifyEmailCode({ code: value }));
    }
  };

  const submit = event => {
    event.preventDefault();
    verify(code);
  };

  const resendCode = () => {
    setResent(false);
    return send(() => setResent(true));
  };

  return (
    <OnboardingFrame
      state={state}
      current="email"
      returnTo={returnTo}
      events={events}
      title={t('onboarding.email.title')}
      subtitle={sent.at ? t('onboarding.email.sent', { email: state?.account?.email || '' }) : ''}
      problem={problem}
    >
      {resent && !problem ? (
        <AuthAlert tone="success">{t('onboarding.email.resent')}</AuthAlert>
      ) : null}
      <form className="auth-form" onSubmit={submit} noValidate>
        {sent.at ? (
          <>
            <CodeInput
              id="email-code"
              label={t('onboarding.email.code')}
              value={code}
              onChange={setCode}
              onComplete={verify}
              disabled={busy}
            />
            <button
              type="submit"
              className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
              disabled={busy}
            >
              {t('onboarding.email.verify')}
            </button>
            <p className="auth-note">{t('onboarding.email.notReceived')}</p>
          </>
        ) : null}
        <ResendCode after={sent.after} since={sent.at} busy={busy} onResend={resendCode} />
      </form>
    </OnboardingFrame>
  );
};

EmailCodeStep.propTypes = {
  returnTo: returnToShape.isRequired,
  events: PropTypes.shape({ emit: PropTypes.func.isRequired }).isRequired,
};

export default EmailCodeStep;
