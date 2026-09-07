import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import FormErrorSummary from '../../../components/common/FormErrorSummary';
import PasswordField from '../../../components/common/PasswordField';
import { useFormRules } from '../../../hooks/useFormRules';
import { returnToShape } from '../../../utils/auth';
import { passwordMinimum } from '../../auth/components/PasswordResetPage';
import { followNext } from '../../auth/next';
import { submitPassword } from '../api/onboarding';
import { useOnboarding, useStepAction } from '../useOnboarding';

import OnboardingFrame from './OnboardingFrame';

const HUB = '/complete-onboarding';
const SCHEMA = {
  required: ['password', 'confirm'],
  properties: { password: { type: 'string' }, confirm: { type: 'string', equals: 'password' } },
};
const LABELS = { password: 'auth:onboarding.password', confirm: 'auth:onboarding.confirm' };

/**
 * `/complete-onboarding`: reads the state and navigates to `next` unless
 * `next` is itself, then draws the password step: "Welcome, {{name}}.",
 * the password with its reveal and the passphrase generator, the
 * confirmation as the page's `equals` rule, a hidden username field
 * carrying the address, and one Continue.
 */
const OnboardingHub = ({ returnTo }) => {
  const { t } = useTranslation(['auth']);
  const navigate = useNavigate();
  const { state } = useOnboarding();
  const { run, busy, problem } = useStepAction(returnTo);
  const [values, setValues] = useState({ password: '', confirm: '' });
  const [revealed, setRevealed] = useState(false);
  const rules = useFormRules({ formKey: 'password', schema: SCHEMA, values, labels: LABELS });
  const here = state?.next === HUB;

  useEffect(() => {
    document.title = t('onboarding.password');
  }, [t]);

  useEffect(() => {
    if (state && !here) {
      followNext({ next: state.next, navigate, returnTo });
    }
  }, [here, navigate, returnTo, state]);

  const submit = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    run(submitPassword({ password: values.password }), rules);
  };

  const change = event => {
    const { name, value } = event.target;
    setValues(previous => ({ ...previous, [name]: value }));
  };

  const firstName = state?.account?.first_name || '';

  return (
    <OnboardingFrame
      state={here ? state : null}
      current="password"
      title={
        firstName ? t('onboarding.welcome', { name: firstName }) : t('onboarding.welcomePlain')
      }
      subtitle={t('onboarding.subhead')}
      problem={problem}
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <FormErrorSummary errors={rules.summary} />
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={state?.account?.email || ''}
          readOnly
          hidden
        />
        <PasswordField
          id={rules.idFor('password')}
          name="password"
          label={t('onboarding.password')}
          value={values.password}
          onChange={change}
          onBlur={() => rules.onBlur('password')}
          error={rules.errors.password || ''}
          hint={t('onboarding.passphraseHint', { min: passwordMinimum() })}
          revealed={revealed}
          onToggleReveal={() => setRevealed(visible => !visible)}
          onGenerate={phrase => {
            setValues({ password: phrase, confirm: phrase });
            setRevealed(true);
          }}
        />
        <PasswordField
          id={rules.idFor('confirm')}
          name="confirm"
          label={t('onboarding.confirm')}
          value={values.confirm}
          onChange={change}
          onBlur={() => rules.onBlur('confirm')}
          error={rules.errors.confirm || ''}
          revealed={revealed}
          onToggleReveal={() => setRevealed(visible => !visible)}
        />
        <button
          type="submit"
          className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
          disabled={busy}
        >
          {t('onboarding.continueTo2fa')}
        </button>
      </form>
      <p className="auth-foot">{t('onboarding.securityNote')}</p>
    </OnboardingFrame>
  );
};

OnboardingHub.propTypes = {
  returnTo: returnToShape.isRequired,
};

export default OnboardingHub;
