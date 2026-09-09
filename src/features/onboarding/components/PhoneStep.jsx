import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { AuthAlert } from '../../../components/common/AuthShell';
import CodeInput from '../../../components/common/CodeInput';
import { useCountdown } from '../../../components/common/Countdown';
import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import PhoneInput from '../../../components/common/PhoneInput';
import { useStatus } from '../../../contexts/StatusContext';
import { formRulesShape, useFormRules } from '../../../hooks/useFormRules';
import { returnToShape } from '../../../utils/auth';
import { geoCountry, sendPhoneCode, verifyPhone } from '../api/onboarding';
import { useOnboarding, useStepAction } from '../useOnboarding';

import OnboardingFrame from './OnboardingFrame';

const SCHEMA = {
  required: ['mobile_number'],
  properties: { mobile_number: { type: 'string', pattern: '^\\+[1-9]\\d{1,14}$' } },
};
const LABELS = { mobile_number: 'auth:onboarding.phone.number' };
const SAFE_PATH = /^\/(?![/\\])/;

const useGeoCountry = () => {
  const [country, setCountry] = useState('');
  useEffect(() => {
    let active = true;
    geoCountry()
      .then(answer => {
        if (active && answer?.country_code) {
          setCountry(String(answer.country_code).toLowerCase());
        }
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);
  return country;
};

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

const PolicyLinks = ({ policies }) => (
  <>
    {policies.map(policy =>
      SAFE_PATH.test(policy.url) ? (
        <Link key={policy.name} to={policy.url} className="auth-link auth-link-muted">
          {policy.label}
        </Link>
      ) : (
        <a key={policy.name} href={policy.url} className="auth-link auth-link-muted">
          {policy.label}
        </a>
      )
    )}
  </>
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

const PhoneField = ({ rules, value, country, onChange }) => {
  const { t } = useTranslation(['auth']);
  const status = useStatus();
  const hint = (
    <>
      {t('onboarding.phone.required', { site: status.brand.name })}{' '}
      {status.links.contact ? (
        <a href={status.links.contact} className="auth-link">
          {t('onboarding.phone.support')}
        </a>
      ) : null}
    </>
  );
  return (
    <Field
      id={rules.idFor('mobile_number')}
      label={t('onboarding.phone.number')}
      error={rules.errors.mobile_number || ''}
      hint={hint}
      className="auth-field"
    >
      {aria => (
        <PhoneInput
          id={aria.id}
          aria={aria}
          value={value}
          initialCountry={country}
          onChange={onChange}
        />
      )}
    </Field>
  );
};

PhoneField.propTypes = {
  rules: formRulesShape.isRequired,
  value: PropTypes.string.isRequired,
  country: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const ConsentLine = ({ purpose, policies }) => {
  const { t } = useTranslation(['auth']);
  return (
    <p className="auth-hint">
      {t(purpose === 'tfa' ? 'onboarding.phone.consentTfa' : 'onboarding.phone.consent')}{' '}
      <PolicyLinks policies={policies} />
    </p>
  );
};

ConsentLine.propTypes = {
  purpose: PropTypes.string.isRequired,
  policies: PolicyLinks.propTypes.policies,
};

const usePhoneStep = returnTo => {
  const { run, busy, problem } = useStepAction(returnTo);
  const [values, setValues] = useState({ mobile_number: '', code: '' });
  const [sent, setSent] = useState({ to: '', at: 0 });
  const rules = useFormRules({ schema: SCHEMA, values, labels: LABELS, idPrefix: 'phone' });
  const changed = Boolean(sent.to) && sent.to !== values.mobile_number;
  const codeReady = Boolean(sent.to) && !changed;

  const send = () => {
    if (!rules.validateAll()) {
      return;
    }
    const number = values.mobile_number;
    run(sendPhoneCode({ mobile_number: number }), rules, () => {
      setSent({ to: number, at: Date.now() });
      setValues(previous => ({ ...previous, code: '' }));
    });
  };

  const verify = value => {
    if (codeReady && value) {
      run(verifyPhone({ mobile_number: sent.to, code: value }), rules);
    }
  };

  const submit = event => {
    event.preventDefault();
    if (codeReady) {
      verify(values.code);
    } else {
      send();
    }
  };

  const setNumber = number => setValues(previous => ({ ...previous, mobile_number: number }));
  const setCode = code => setValues(previous => ({ ...previous, code }));

  return {
    values,
    sent,
    rules,
    busy,
    problem,
    changed,
    codeReady,
    send,
    verify,
    submit,
    setNumber,
    setCode,
  };
};

/**
 * `/complete-onboarding/phone-setup`: the `PhoneInput` to E.164, the
 * requirement line with the site's support contact, the consent line
 * worded by `phone.purpose`, "Send verification code", then the
 * `CodeInput` with Resend under the sending countdown; a number edited
 * after a send keeps the code section with "Number changed. Send a new
 * code." and Verify disabled; the policy links and, for a `tfa` step,
 * "Choose a different method".
 */
const PhoneStep = ({ returnTo }) => {
  const { t } = useTranslation(['auth']);
  const { state } = useOnboarding();
  const country = useGeoCountry();
  const step = usePhoneStep(returnTo);
  const purpose = state?.phone?.purpose || 'verify';

  useEffect(() => {
    document.title = t('onboarding.phone.title');
  }, [t]);

  return (
    <OnboardingFrame
      state={state}
      current="phone"
      title={t('onboarding.phone.title')}
      subtitle={t(
        purpose === 'tfa' ? 'onboarding.phone.subheadTfa' : 'onboarding.phone.subheadVerify'
      )}
      problem={step.problem}
    >
      {step.codeReady ? (
        <AuthAlert tone="success">
          {t('onboarding.phone.found', { number: step.sent.to })}
        </AuthAlert>
      ) : null}
      {step.changed ? <AuthAlert tone="info">{t('onboarding.phone.changed')}</AuthAlert> : null}
      <form className="auth-form" onSubmit={step.submit} noValidate>
        <FormErrorSummary errors={step.rules.summary} />
        <PhoneField
          rules={step.rules}
          value={step.values.mobile_number}
          country={country}
          onChange={step.setNumber}
        />
        {step.sent.to ? (
          <>
            <CodeInput
              id="phone-code"
              label={t('onboarding.phone.code')}
              value={step.values.code}
              onChange={step.setCode}
              onComplete={step.verify}
              disabled={step.busy || !step.codeReady}
            />
            <ResendCode
              after={step.changed ? 0 : state?.phone?.resend_after_seconds || 0}
              since={step.sent.at}
              onResend={step.send}
            />
          </>
        ) : null}
        <ConsentLine purpose={purpose} policies={state?.phone?.policies || []} />
        <button
          type="submit"
          className={`auth-btn auth-btn-primary auth-btn-block${step.busy ? ' is-loading' : ''}`}
          disabled={step.busy || step.changed}
        >
          {step.sent.to ? t('onboarding.phone.verify') : t('onboarding.phone.send')}
        </button>
      </form>
      {purpose === 'tfa' ? (
        <p className="auth-foot">
          <Link to="/complete-onboarding/choose-2fa-method" className="auth-link auth-link-muted">
            {t('onboarding.phone.chooseOther')}
          </Link>
        </p>
      ) : null}
    </OnboardingFrame>
  );
};

PhoneStep.propTypes = {
  returnTo: returnToShape.isRequired,
};

export default PhoneStep;
