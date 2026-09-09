import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useProblemReporter } from '../../hooks/useProblemReporter';
import { followNext } from '../../lib/next';

import { onboardingState } from './api/onboarding';

const SESSION_EXPIRED = '/login?error=session_expired';

export const onboardingShape = PropTypes.shape({
  next: PropTypes.string.isRequired,
  steps: PropTypes.arrayOf(PropTypes.string).isRequired,
  done: PropTypes.arrayOf(PropTypes.string).isRequired,
  account: PropTypes.shape({
    email: PropTypes.string,
    first_name: PropTypes.string,
    mobile_number: PropTypes.string,
  }),
  phone: PropTypes.shape({
    purpose: PropTypes.oneOf(['verify', 'tfa']),
    resend_after_seconds: PropTypes.number,
    policies: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        url: PropTypes.string.isRequired,
      })
    ),
  }),
  tfa: PropTypes.shape({
    sms_risk_notice: PropTypes.bool,
    verified_phone: PropTypes.string,
  }),
  org: PropTypes.shape({
    required_by_client: PropTypes.string,
  }),
});

/**
 * The one state call every step page reads, `GET /api/auth/onboarding`,
 * fetched on mount and again through `reload`: the answer, or null while
 * it is on its way or after a failure; a `401` sends the visitor to
 * `/login?error=session_expired`, any other failure raises one danger card.
 *
 * @returns {{ state: Object|null, failed: boolean, reload: Function }}
 */
export const useOnboarding = () => {
  const navigate = useNavigate();
  const report = useProblemReporter();
  const [state, setState] = useState(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(
    () =>
      onboardingState()
        .then(answer => {
          setState(answer);
          setFailed(false);
          return answer;
        })
        .catch(error => {
          if (error.status === 401) {
            navigate(SESSION_EXPIRED, { replace: true });
            return null;
          }
          report(error);
          setFailed(true);
          return null;
        }),
    [navigate, report]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return { state, failed, reload };
};

/**
 * How a step page runs its one action: the problem cleared, the button
 * busy, `next` followed on success, a `401` sent to sign in, a `422`
 * painted through `rules` and a problem `code` kept for the alert.
 *
 * @param {Object} returnTo - The helper from `createReturnTo`
 * @returns {{ run: Function, busy: boolean, problem: Object|null, setProblem: Function }}
 */
export const useStepAction = returnTo => {
  const navigate = useNavigate();
  const report = useProblemReporter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  const run = useCallback(
    (promise, rules = null, onAnswer = null) => {
      setProblem(null);
      setBusy(true);
      return promise
        .then(answer => {
          if (onAnswer) {
            setBusy(false);
            onAnswer(answer);
            return answer;
          }
          followNext({ next: answer?.next, navigate, returnTo });
          return answer;
        })
        .catch(error => {
          setBusy(false);
          if (error.status === 401) {
            navigate(SESSION_EXPIRED, { replace: true });
            return null;
          }
          setProblem(report(error, rules));
          return null;
        });
    },
    [navigate, report, returnTo]
  );

  return { run, busy, problem, setProblem };
};
