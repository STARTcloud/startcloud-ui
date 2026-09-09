import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import Field from '../../../components/common/Field';
import FormErrorSummary from '../../../components/common/FormErrorSummary';
import { useFormRules } from '../../../hooks/useFormRules';
import { returnToShape } from '../../../utils/auth';
import { NON_BLANK } from '../../../utils/validation';
import { submitTeamName } from '../api/onboarding';
import { useOnboarding, useStepAction } from '../useOnboarding';

import OnboardingFrame from './OnboardingFrame';

const SCHEMA = { required: ['team_name'], properties: { team_name: NON_BLANK } };
const LABELS = { team_name: 'auth:onboarding.team.name' };

/**
 * `/complete-onboarding/team-name`: the team name, "Create team" posting
 * `{ team_name }` and following `next`, and "Back" to the tiles; the
 * subhead names the client that required an organization.
 */
const TeamNameStep = ({ returnTo }) => {
  const { t } = useTranslation(['auth']);
  const { state } = useOnboarding();
  const { run, busy, problem } = useStepAction(returnTo);
  const [values, setValues] = useState({ team_name: '' });
  const rules = useFormRules({ schema: SCHEMA, values, labels: LABELS, idPrefix: 'team' });
  const requiredBy = state?.org?.required_by_client || '';

  useEffect(() => {
    document.title = t('onboarding.team.title');
  }, [t]);

  const submit = event => {
    event.preventDefault();
    if (!rules.validateAll()) {
      return;
    }
    run(submitTeamName(values), rules);
  };

  return (
    <OnboardingFrame
      state={state}
      current="org"
      title={t('onboarding.team.title')}
      subtitle={
        requiredBy
          ? t('onboarding.account.requiredBy', { client: requiredBy })
          : t('onboarding.team.subhead')
      }
      problem={problem}
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <FormErrorSummary errors={rules.summary} />
        <Field
          id={rules.idFor('team_name')}
          label={t('onboarding.team.name')}
          error={rules.errors.team_name || ''}
          className="auth-field"
        >
          {aria => (
            <div className="auth-input-wrap">
              <input
                {...aria}
                name="team_name"
                type="text"
                autoComplete="organization"
                value={values.team_name}
                onChange={event => setValues({ team_name: event.target.value })}
                onBlur={() => rules.onBlur('team_name')}
              />
            </div>
          )}
        </Field>
        <button
          type="submit"
          className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
          disabled={busy}
        >
          {t('onboarding.team.create')}
        </button>
      </form>
      {requiredBy ? null : (
        <p className="auth-foot">
          <Link to="/complete-onboarding/account-type" className="auth-link auth-link-muted">
            {t('onboarding.team.back')}
          </Link>
        </p>
      )}
    </OnboardingFrame>
  );
};

TeamNameStep.propTypes = {
  returnTo: returnToShape.isRequired,
};

export default TeamNameStep;
