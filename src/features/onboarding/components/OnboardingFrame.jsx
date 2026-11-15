import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import AuthShell, { AuthSpinner } from '../../../components/common/AuthShell';
import DeviceCodeTimer, {
  useDeviceCode,
  userCodeOf,
} from '../../../components/common/DeviceCodeTimer';
import ProblemAlert from '../../../components/common/ProblemAlert';
import StepDots from '../../../components/common/StepDots';
import { problemShape, useProblemReporter } from '../../../hooks/useProblemReporter';
import { followNext } from '../../../lib/next';
import { session } from '../../../lib/runtime';
import { cancelSignIn } from '../../../lib/signin';
import { returnToShape } from '../../../utils/auth';
import { deviceCode } from '../api/onboarding';
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
 * appears, the problem alert, the time a waiting device login has left
 * while the remembered return path is `/activate` with a `user_code`, a
 * spinner while the state is on its way, the step's own content once it
 * has arrived, and the foot: the step's own `foot` link, then Cancel,
 * which posts `/auth-cancel`, drops the cached profile and follows the
 * answer's `next`, a client's redirect URI included, the session re-read
 * through `events` before an in-router move so the page it lands on draws
 * nobody as signed in.
 */
const OnboardingFrame = ({
  state,
  current,
  title,
  returnTo,
  events,
  subtitle = '',
  problem = null,
  wide = false,
  foot = null,
  children,
}) => {
  const { t } = useTranslation(['auth', 'shared']);
  const navigate = useNavigate();
  const report = useProblemReporter();
  const heading = useRef(null);
  const [cancelProblem, setCancelProblem] = useState(null);
  const device = useDeviceCode(deviceCode, userCodeOf(returnTo.peek()));
  const ready = Boolean(state);
  const shown = cancelProblem || problem;

  useEffect(() => {
    if (ready) {
      heading.current?.focus();
    }
  }, [ready, current]);

  const labels = Object.fromEntries(
    Object.entries(STEP_LABELS).map(([step, key]) => [step, t(key)])
  );

  const cancel = () => {
    setCancelProblem(null);
    return cancelSignIn()
      .then(answer => {
        session.dropProfile();
        return followNext({ next: answer?.next, navigate, returnTo, trusted: true, events });
      })
      .catch(error => setCancelProblem(report(error)));
  };

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
      {shown ? <ProblemAlert problem={shown} /> : null}
      <DeviceCodeTimer device={device} />
      {ready ? children : <AuthSpinner label={t('shared:loading')} />}
      <p className="auth-foot">
        {ready && foot ? (
          <>
            {foot}
            {' · '}
          </>
        ) : null}
        <button type="button" className="auth-link auth-link-muted" onClick={cancel}>
          {t('login.cancel')}
        </button>
      </p>
    </AuthShell>
  );
};

OnboardingFrame.propTypes = {
  state: onboardingShape,
  current: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  returnTo: returnToShape.isRequired,
  events: PropTypes.shape({ emit: PropTypes.func.isRequired }).isRequired,
  subtitle: PropTypes.node,
  problem: problemShape,
  wide: PropTypes.bool,
  foot: PropTypes.node,
  children: PropTypes.node,
};

export default OnboardingFrame;
