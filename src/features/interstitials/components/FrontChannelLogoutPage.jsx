import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import AuthShell, { AuthSpinner } from '../../../components/common/AuthShell';
import ProblemAlert from '../../../components/common/ProblemAlert';
import { useProblemReporter } from '../../../hooks/useProblemReporter';
import { followNext } from '../../../lib/next';
import { returnToShape } from '../../../utils/auth';
import { frontChannelDone, frontChannelState } from '../api/interstitials';

const MIN_SECONDS = 20;
const MAX_SECONDS = 60;
const HTTPS = /^https:\/\//i;

const clampTimeout = seconds =>
  Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Number(seconds) || MIN_SECONDS));

/**
 * `/connect/logout/frontchannel`: "Signing out", one hidden sandboxed
 * iframe per relying party's `frame_urls` entry, the done route posted
 * and `continuation` followed once every frame fired `load` or `error`
 * or the person pressed Continue, with "Stay on this page" and a fallback
 * of twenty to sixty seconds that pauses while the pointer or focus rests
 * on the page.
 */
const FrontChannelLogoutPage = ({ returnTo }) => {
  const { t } = useTranslation(['auth', 'shared']);
  const navigate = useNavigate();
  const report = useProblemReporter();
  const [answer, setAnswer] = useState(null);
  const [problem, setProblem] = useState(null);
  const [fired, setFired] = useState(0);
  const [remaining, setRemaining] = useState(MAX_SECONDS);
  const [paused, setPaused] = useState(false);
  const [stay, setStay] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    document.title = t('logout.signingOut');
  }, [t]);

  useEffect(() => {
    let active = true;
    frontChannelState()
      .then(result => {
        if (active) {
          setAnswer(result);
          setRemaining(clampTimeout(result?.timeout_seconds));
        }
      })
      .catch(error => {
        if (active) {
          setProblem(report(error));
        }
      });
    return () => {
      active = false;
    };
  }, [report]);

  const finish = useCallback(() => {
    if (finished.current || !answer) {
      return;
    }
    finished.current = true;
    frontChannelDone()
      .catch(() => null)
      .then(() => followNext({ next: answer.continuation, navigate, returnTo, trusted: true }));
  }, [answer, navigate, returnTo]);

  const frames = (answer?.frame_urls || []).filter(url => HTTPS.test(url));
  const allFired = Boolean(answer) && fired >= frames.length;

  useEffect(() => {
    if (allFired && !stay) {
      finish();
    }
  }, [allFired, finish, stay]);

  useEffect(() => {
    if (!answer || stay || paused || remaining <= 0) {
      return undefined;
    }
    const timer = setInterval(() => setRemaining(count => count - 1), 1000);
    return () => clearInterval(timer);
  }, [answer, paused, remaining, stay]);

  useEffect(() => {
    if (answer && !stay && remaining <= 0) {
      finish();
    }
  }, [answer, finish, remaining, stay]);

  const count = () => setFired(value => value + 1);
  const pause = () => setPaused(true);
  const resume = () => setPaused(false);

  return (
    <div
      role="presentation"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <AuthShell title={t('logout.signingOut')} subtitle={t('logout.notifying')}>
        {problem ? <ProblemAlert problem={problem} /> : null}
        {!answer && !problem ? <AuthSpinner label={t('shared:loading')} /> : null}
        {answer ? (
          <>
            <div className="auth-frames" aria-hidden="true">
              {frames.map(url => (
                <iframe
                  key={url}
                  src={url}
                  title={url}
                  sandbox="allow-scripts allow-same-origin"
                  referrerPolicy="no-referrer"
                  onLoad={count}
                  onError={count}
                />
              ))}
            </div>
            <div className="auth-form">
              <button
                type="button"
                className="auth-btn auth-btn-primary auth-btn-block"
                onClick={finish}
              >
                {t('logout.continue')}
              </button>
              <button
                type="button"
                className="auth-btn auth-btn-secondary auth-btn-block"
                disabled={stay}
                onClick={() => setStay(true)}
              >
                {t('logout.stay')}
              </button>
            </div>
          </>
        ) : null}
      </AuthShell>
    </div>
  );
};

FrontChannelLogoutPage.propTypes = {
  returnTo: returnToShape.isRequired,
};

export default FrontChannelLogoutPage;
