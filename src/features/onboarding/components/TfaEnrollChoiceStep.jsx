import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Field from '../../../components/common/Field';
import OptionList, { Option } from '../../../components/common/OptionList';
import { problemOf } from '../../../hooks/useProblemReporter';
import { isAbort, isSupported, passkeyCodeOf, register } from '../../../lib/passkeys';
import { returnToShape } from '../../../utils/auth';
import {
  chooseTfaMethod,
  completePasskey,
  passkeyCreationOptions,
  registerPasskey,
} from '../api/onboarding';
import { useOnboarding, useStepAction } from '../useOnboarding';

import OnboardingFrame from './OnboardingFrame';

const PASSKEY = 'PASSKEY';
const PASSKEY_NAME = 'onboarding-passkey-name';

/**
 * `/complete-onboarding/choose-2fa-method`: Authenticator app
 * (recommended) and SMS, the verified number line when the state carries
 * one and the risk notice when the site asks for it, and Passkey while the
 * state says `tfa.passkey` and the browser supports WebAuthn, with its
 * name field drawn while it is the chosen one; Continue posts the choice
 * and follows `next`, and for a passkey, disabled until it is named,
 * registers it under that name, posts `/complete-onboarding/passkey` and
 * follows `next`. A dismissed browser prompt leaves the page as it is, and
 * any other failure of the registration draws the problem alert.
 */
const TfaEnrollChoiceStep = ({ returnTo, events }) => {
  const { t } = useTranslation(['auth', 'shared']);
  const { state } = useOnboarding();
  const { run, busy, problem, setProblem } = useStepAction(returnTo);
  const [method, setMethod] = useState('APP');
  const [name, setName] = useState('');
  const [registering, setRegistering] = useState(false);
  const offersPasskey = Boolean(state?.tfa?.passkey) && isSupported();
  const unnamed = method === PASSKEY && !name;

  useEffect(() => {
    document.title = t('onboarding.tfa.title');
  }, [t]);

  const enrollPasskey = () => {
    setProblem(null);
    setRegistering(true);
    register({
      creationOptions: passkeyCreationOptions,
      register: registerPasskey,
      label: name,
    }).then(
      () => {
        setRegistering(false);
        run(completePasskey());
      },
      error => {
        setRegistering(false);
        if (!isAbort(error)) {
          setProblem({ ...problemOf(error), code: passkeyCodeOf(error) });
        }
      }
    );
  };

  const submit = event => {
    event.preventDefault();
    if (unnamed) {
      return;
    }
    if (method === PASSKEY) {
      enrollPasskey();
      return;
    }
    run(chooseTfaMethod({ method }));
  };

  const working = busy || registering;

  return (
    <OnboardingFrame
      state={state}
      current="tfa"
      returnTo={returnTo}
      events={events}
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
          {offersPasskey ? (
            <Option
              name="method"
              value={PASSKEY}
              checked={method === PASSKEY}
              onChange={setMethod}
              label={t('onboarding.tfa.passkey')}
              help={t('onboarding.tfa.passkeyHelp')}
            >
              {method === PASSKEY ? (
                <Field
                  id={PASSKEY_NAME}
                  label={t('shared:profile.security.passkeys.name')}
                  className="auth-field"
                >
                  {aria => (
                    <div className="auth-input-wrap">
                      <input
                        {...aria}
                        type="text"
                        value={name}
                        disabled={working}
                        onChange={event => setName(event.target.value)}
                      />
                    </div>
                  )}
                </Field>
              ) : null}
            </Option>
          ) : null}
        </OptionList>
        <button
          type="submit"
          className={`auth-btn auth-btn-primary auth-btn-block${working ? ' is-loading' : ''}`}
          disabled={working || unnamed}
        >
          {t('tfa.continue')}
        </button>
      </form>
    </OnboardingFrame>
  );
};

TfaEnrollChoiceStep.propTypes = {
  returnTo: returnToShape.isRequired,
  events: PropTypes.shape({ emit: PropTypes.func.isRequired }).isRequired,
};

export default TfaEnrollChoiceStep;
