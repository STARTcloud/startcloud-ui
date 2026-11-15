import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaUser, FaUsers } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import ChoiceTile from '../../../components/common/ChoiceTile';
import { useStatus } from '../../../contexts/StatusContext';
import { followNext } from '../../../lib/next';
import { returnToShape } from '../../../utils/auth';
import { hasFeature } from '../../../utils/capabilities';
import { submitAccountType } from '../api/onboarding';
import { useOnboarding, useStepAction } from '../useOnboarding';

import OnboardingFrame from './OnboardingFrame';

const TEAM_NAME = '/complete-onboarding/team-name';

/**
 * `/complete-onboarding/account-type`, its tiles drawn while the host
 * lists the `teams` sub flag of `org-console`: the two tiles, personal
 * and team, the subhead naming the client when it required an
 * organization, in which case the personal tile is hidden and the team
 * name drawn at once. Without the sub flag the page draws no tiles: it
 * follows the state's own `next`.
 */
const AccountTypeStep = ({ returnTo, events }) => {
  const { t } = useTranslation(['auth']);
  const navigate = useNavigate();
  const { state } = useOnboarding();
  const status = useStatus();
  const { run, busy, problem } = useStepAction(returnTo);
  const offered = hasFeature(status, 'org-console', 'teams');
  const next = state?.next || '';
  const requiredBy = state?.org?.required_by_client || '';

  useEffect(() => {
    document.title = t('onboarding.account.title');
  }, [t]);

  useEffect(() => {
    if (!offered && next) {
      followNext({ next, navigate, returnTo });
    }
  }, [offered, next, navigate, returnTo]);

  useEffect(() => {
    if (offered && requiredBy) {
      navigate(TEAM_NAME, { replace: true });
    }
  }, [navigate, offered, requiredBy]);

  const choose = accountType => run(submitAccountType({ account_type: accountType }));

  return (
    <OnboardingFrame
      state={offered ? state : null}
      current="org"
      returnTo={returnTo}
      events={events}
      title={t('onboarding.account.title')}
      subtitle={t('onboarding.account.subhead')}
      problem={problem}
    >
      {offered ? (
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
      ) : null}
    </OnboardingFrame>
  );
};

AccountTypeStep.propTypes = {
  returnTo: returnToShape.isRequired,
  events: PropTypes.shape({ emit: PropTypes.func.isRequired }).isRequired,
};

export default AccountTypeStep;
