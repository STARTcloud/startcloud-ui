import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { returnToShape } from '../../../utils/auth';
import AuthShell, { AuthSpinner } from '../../auth/components/AuthShell';
import ProblemAlert from '../../auth/components/ProblemAlert';
import { followNext } from '../../auth/next';
import { useProblemReporter } from '../../auth/problem';
import { logoutConfirm, logoutConfirmState } from '../api/interstitials';

/**
 * `/connect/logout/confirm`: "Sign out?", the client and every app that
 * uses this sign-in, the client's `logout_text` or the default line, "Yes,
 * sign me out" posting `{ confirm: true }` and following `next` to the
 * protocol endpoint, Cancel posting `false` and following the client's
 * cancel URI; nothing parked sends the page home.
 */
const LogoutConfirmPage = ({ returnTo }) => {
  const { t } = useTranslation(['auth', 'shared']);
  const navigate = useNavigate();
  const report = useProblemReporter();
  const [answer, setAnswer] = useState(null);
  const [problem, setProblem] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = t('logout.title');
  }, [t]);

  useEffect(() => {
    let active = true;
    logoutConfirmState()
      .then(result => {
        if (active) {
          setAnswer(result);
        }
      })
      .catch(error => {
        if (!active) {
          return;
        }
        if (error.status === 404) {
          navigate('/', { replace: true });
          return;
        }
        setProblem(report(error));
      });
    return () => {
      active = false;
    };
  }, [navigate, report]);

  const decide = confirm => {
    setBusy(true);
    setProblem(null);
    logoutConfirm(confirm)
      .then(result => followNext({ next: result?.next, navigate, returnTo, trusted: !confirm }))
      .catch(error => {
        setBusy(false);
        setProblem(report(error));
      });
  };

  return (
    <AuthShell
      title={t('logout.title')}
      subtitle={answer ? t('logout.subhead', { client: answer.client_name }) : ''}
    >
      {problem ? <ProblemAlert problem={problem} /> : null}
      {!answer && !problem ? <AuthSpinner label={t('shared:loading')} /> : null}
      {answer ? (
        <>
          <p className="auth-note">{answer.logout_text || t('logout.default')}</p>
          <button
            type="button"
            className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
            disabled={busy}
            onClick={() => decide(true)}
          >
            {t('logout.confirm')}
          </button>
          <button
            type="button"
            className="auth-btn auth-btn-secondary auth-btn-block"
            disabled={busy}
            onClick={() => decide(false)}
          >
            {t('logout.cancel')}
          </button>
        </>
      ) : null}
    </AuthShell>
  );
};

LogoutConfirmPage.propTypes = {
  returnTo: returnToShape.isRequired,
};

export default LogoutConfirmPage;
