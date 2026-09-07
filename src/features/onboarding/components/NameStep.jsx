import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import { useFormRules } from '../../../hooks/useFormRules';
import { returnToShape } from '../../../utils/auth';
import { submitName } from '../api/onboarding';
import { useOnboarding, useStepAction } from '../useOnboarding';

import OnboardingFrame from './OnboardingFrame';

const SCHEMA = {
  required: ['given_name'],
  properties: {
    given_name: { $ref: '#/$defs/personName' },
    family_name: { $ref: '#/$defs/personName' },
  },
};
const LABELS = {
  given_name: 'auth:onboarding.name.given',
  family_name: 'auth:onboarding.name.family',
};

/**
 * `/complete-onboarding/name`: given names and family name with the
 * `given-name` and `family-name` autofill tokens, the family-name hint,
 * and Continue posting `{ given_name, family_name }`.
 */
const NameStep = ({ returnTo }) => {
  const { t } = useTranslation(['auth']);
  const { state } = useOnboarding();
  const { run, busy, problem } = useStepAction(returnTo);
  const [values, setValues] = useState({ given_name: '', family_name: '' });
  const rules = useFormRules({ formKey: 'name', schema: SCHEMA, values, labels: LABELS });

  useEffect(() => {
    document.title = t('onboarding.name.title');
  }, [t]);

  const submit = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    run(submitName(values), rules);
  };

  const change = event => {
    const { name, value } = event.target;
    setValues(previous => ({ ...previous, [name]: value }));
  };

  const field = (name, autoComplete, hint = '') => (
    <Field
      id={rules.idFor(name)}
      label={t(`onboarding.name.${name === 'given_name' ? 'given' : 'family'}`)}
      hint={hint}
      error={rules.errors[name] || ''}
      className="auth-field"
    >
      {aria => (
        <div className="auth-input-wrap">
          <input
            {...aria}
            name={name}
            type="text"
            autoComplete={autoComplete}
            value={values[name]}
            onChange={change}
            onBlur={() => rules.onBlur(name)}
          />
        </div>
      )}
    </Field>
  );

  return (
    <OnboardingFrame
      state={state}
      current="name"
      title={t('onboarding.name.title')}
      subtitle={t('onboarding.name.subhead')}
      problem={problem}
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <FormErrorSummary errors={rules.summary} />
        {field('given_name', 'given-name')}
        {field('family_name', 'family-name', t('onboarding.name.familyHint'))}
        <button
          type="submit"
          className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
          disabled={busy}
        >
          {t('onboarding.continueTo2fa')}
        </button>
      </form>
    </OnboardingFrame>
  );
};

NameStep.propTypes = {
  returnTo: returnToShape.isRequired,
};

export default NameStep;
