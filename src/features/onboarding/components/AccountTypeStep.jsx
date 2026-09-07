import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaUser, FaUsers } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import ChoiceTile from '../../../components/common/ChoiceTile';
import { returnToShape } from '../../../utils/auth';
import { submitAccountType } from '../api/onboarding';
import { useOnboarding, useStepAction } from '../useOnboarding';

import OnboardingFrame from './OnboardingFrame';

const TEAM_NAME = '/complete-onboarding/team-name';

/**
 * `/complete-onboarding/account-type`: the two tiles, personal and team,
 * the subhead naming the client when it required an organization, in
 * which case the personal tile is hidden and the team name drawn at once.
 */
const AccountTypeStep = ({ returnTo }) => {
  const { t } = useTranslation(['auth']);
  const navigate = useNavigate();
  const { state } = useOnboarding();
  const { run, busy, problem } = useStepAction(returnTo);
  const requiredBy = state?.org?.required_by_client || '';

  useEffect(() => {
    document.title = t('onboarding.account.title');
  }, [t]);

  useEffect(() => {
    if (requiredBy) {
      navigate(TEAM_NAME, { replace: true });
    }
  }, [navigate, requiredBy]);

  const choose = accountType => run(submitAccountType({ account_type: accountType }));

  return (
    <OnboardingFrame
      state={state}
      current="org"
      title={t('onboarding.account.title')}
      subtitle={t('onboarding.account.subhead')}
      problem={problem}
    >
      <div className="choice-tiles">
        <ChoiceTile
          icon={<FaUser />}
          title={t('onboarding.account.personal')}
          description={t('onboarding.account.personalHelp')}
          onClick={() => choose('personal')}
          disabled={busy}
        />
        <ChoiceTile
          icon={<FaUsers />}
          title={t('onboarding.account.team')}
          description={t('onboarding.account.teamHelp')}
          onClick={() => choose('team')}
          disabled={busy}
        />
      </div>
    </OnboardingFrame>
  );
};

AccountTypeStep.propTypes = {
  returnTo: returnToShape.isRequired,
};

export default AccountTypeStep;
