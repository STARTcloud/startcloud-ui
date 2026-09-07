import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CodeInput from '../../../components/common/CodeInput';
import { useCountdown } from '../../../components/common/Countdown';
import { returnToShape } from '../../../utils/auth';
import { AuthAlert } from '../../auth/components/AuthShell';
import { resendEmailCode, verifyEmailCode } from '../api/onboarding';
import { useOnboarding, useStepAction } from '../useOnboarding';

import OnboardingFrame from './OnboardingFrame';

const ResendCode = ({ after, since, onResend }) => {
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
        ? t('onboarding.phone.resendIn', { n: remaining })
        : t('onboarding.phone.resend')}
    </button>
  );
};

ResendCode.propTypes = {
  after: PropTypes.number.isRequired,
  since: PropTypes.number.isRequired,
  onResend: PropTypes.func.isRequired,
};

/**
 * `/complete-onboarding/email-verification`: "A verification code has
 * been sent to {{email}}", the `CodeInput`, Verify, and Resend under a
 * countdown from the resend route's answer, the gate's countdown in the
 * danger alert.
 */
const EmailCodeStep = ({ returnTo }) => {
  const { t } = useTranslation(['auth']);
  const { state } = useOnboarding();
  const { run, busy, problem } = useStepAction(returnTo);
  const [code, setCode] = useState('');
  const [resend, setResend] = useState({ after: 0, at: 0, sent: false });

  useEffect(() => {
    document.title = t('onboarding.email.title');
  }, [t]);

  const verify = value => {
    if (value) {
      run(verifyEmailCode({ code: value }));
    }
  };

  const submit = event => {
    event.preventDefault();
    verify(code);
  };

  const resendCode = () =>
    run(resendEmailCode(), null, answer =>
      setResend({ after: Number(answer?.resend_after_seconds) || 0, at: Date.now(), sent: true })
    );

  return (
    <OnboardingFrame
      state={state}
      current="email"
      title={t('onboarding.email.title')}
      subtitle={t('onboarding.email.sent', { email: state?.account?.email || '' })}
      problem={problem}
    >
      {resend.sent && !problem ? (
        <AuthAlert tone="success">{t('onboarding.email.resent')}</AuthAlert>
      ) : null}
      <form className="auth-form" onSubmit={submit} noValidate>
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
        <ResendCode after={resend.after} since={resend.at} onResend={resendCode} />
      </form>
    </OnboardingFrame>
  );
};

EmailCodeStep.propTypes = {
  returnTo: returnToShape.isRequired,
};

export default EmailCodeStep;
