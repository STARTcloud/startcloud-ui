import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import OptionList, { Option } from '../../../components/common/OptionList';
import { returnToShape } from '../../../utils/auth';
import { chooseTfaMethod } from '../api/onboarding';
import { useOnboarding, useStepAction } from '../useOnboarding';

import OnboardingFrame from './OnboardingFrame';

/**
 * `/complete-onboarding/choose-2fa-method`: Authenticator app
 * (recommended) and SMS, the verified number line when the state carries
 * one and the risk notice when the site asks for it, Continue posting the
 * choice and following `next`.
 */
const TfaEnrollChoiceStep = ({ returnTo }) => {
  const { t } = useTranslation(['auth']);
  const { state } = useOnboarding();
  const { run, busy, problem } = useStepAction(returnTo);
  const [method, setMethod] = useState('APP');

  useEffect(() => {
    document.title = t('onboarding.tfa.title');
  }, [t]);

  const submit = event => {
    event.preventDefault();
    run(chooseTfaMethod({ method }));
  };

  return (
    <OnboardingFrame
      state={state}
      current="tfa"
      title={t('onboarding.tfa.title')}
      subtitle={t('onboarding.tfa.subhead')}
      problem={problem}
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <OptionList label={t('onboarding.tfa.title')}>
          <Option
            name="method"
            value="APP"
            checked={method === 'APP'}
            onChange={setMethod}
            label={t('onboarding.tfa.app')}
            help={t('onboarding.tfa.appHelp')}
          />
          <Option
            name="method"
            value="SMS"
            checked={method === 'SMS'}
            onChange={setMethod}
            label={t('onboarding.tfa.sms')}
            help={
              state?.tfa?.verified_phone
                ? t('onboarding.tfa.smsVerified', { number: state.tfa.verified_phone })
                : t('onboarding.tfa.smsHelp')
            }
          >
            {state?.tfa?.sms_risk_notice ? (
              <span className="option-card-help">{t('tfa.method.smsRisk')}</span>
            ) : null}
          </Option>
        </OptionList>
        <button
          type="submit"
          className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
          disabled={busy}
        >
          {t('tfa.continue')}
        </button>
      </form>
    </OnboardingFrame>
  );
};

TfaEnrollChoiceStep.propTypes = {
  returnTo: returnToShape.isRequired,
};

export default TfaEnrollChoiceStep;
