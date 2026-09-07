import { useTranslation } from 'react-i18next';

import { useCountdown } from '../../../components/common/Countdown';
import { problemShape } from '../problem';

import { AuthAlert } from './AuthShell';

/**
 * The seconds a problem's guessing gate still holds, zero when it carried
 * no wait or the wait is over.
 *
 * @param {Object|null} problem - The page's problem
 * @returns {number}
 */
export const useWait = problem => useCountdown(problem?.wait || 0, problem?.since || 0);

/**
 * The danger alert a problem `code` paints, translated from
 * `auth:errors.<code>` with `authenticationFailed` for a code the page does
 * not know; while the answer carried `wait_seconds` a `role="timer"` span
 * beside the alert counts down, never re-announced, and at zero the alert
 * becomes the info "You can try again now."
 */
const ProblemAlert = ({ problem }) => {
  const { t } = useTranslation(['auth']);
  const remaining = useWait(problem);
  if (problem.wait > 0 && remaining === 0) {
    return <AuthAlert tone="info">{t('tfa.waitReady')}</AuthAlert>;
  }
  return (
    <div className="auth-alert-stack">
      <AuthAlert tone="danger">
        {t([`errors.${problem.code}`, 'errors.authenticationFailed'])}
      </AuthAlert>
      {remaining > 0 ? (
        <span className="auth-alert-timer" role="timer" aria-live="off">
          {t('tfa.waitCountdown', { n: remaining })}
        </span>
      ) : null}
    </div>
  );
};

ProblemAlert.propTypes = {
  problem: problemShape.isRequired,
};

export default ProblemAlert;
