import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import StepDots from '../../../components/common/StepDots';
import AuthShell, { AuthSpinner } from '../../auth/components/AuthShell';
import ProblemAlert from '../../auth/components/ProblemAlert';
import { problemShape } from '../../auth/problem';
import { onboardingShape } from '../useOnboarding';

const STEP_LABELS = {
  name: 'onboarding.name.title',
  phone: 'onboarding.phone.title',
  password: 'onboarding.password',
  email: 'onboarding.email.title',
  tfa: 'onboarding.tfa.title',
  org: 'onboarding.account.title',
};

/**
 * The frame every onboarding step draws in: the step dots from the
 * state's `steps` and `done`, the heading that takes focus when the step
 * appears, the problem alert, a spinner while the state is on its way,
 * and the step's own content once it has arrived.
 */
const OnboardingFrame = ({
  state,
  current,
  title,
  subtitle = '',
  problem = null,
  wide = false,
  children,
}) => {
  const { t } = useTranslation(['auth', 'shared']);
  const heading = useRef(null);
  const ready = Boolean(state);

  useEffect(() => {
    if (ready) {
      heading.current?.focus();
    }
  }, [ready, current]);

  const labels = Object.fromEntries(
    Object.entries(STEP_LABELS).map(([step, key]) => [step, t(key)])
  );

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      wide={wide}
      headingRef={heading}
      top={
        state && state.steps.includes(current) ? (
          <StepDots steps={state.steps} done={state.done} current={current} labels={labels} />
        ) : null
      }
    >
      {problem ? <ProblemAlert problem={problem} /> : null}
      {ready ? children : <AuthSpinner label={t('shared:loading')} />}
    </AuthShell>
  );
};

OnboardingFrame.propTypes = {
  state: onboardingShape,
  current: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.node,
  problem: problemShape,
  wide: PropTypes.bool,
  children: PropTypes.node,
};

export default OnboardingFrame;
