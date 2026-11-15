import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import AuthShell, { AuthAlert, AuthSpinner } from '../../../components/common/AuthShell';
import ProblemAlert from '../../../components/common/ProblemAlert';
import { AccountRows } from '../../../components/layout/AccountSwitcherModal';
import { useProblemReporter } from '../../../hooks/useProblemReporter';

/**
 * `/select-account`, the chooser of the browser's accounts: reads
 * `GET /api/auth/accounts` through the session and draws one row per
 * entry with the picture, the name and the email, the active account and
 * a remembered one marked, the waiting application named while `pending`
 * is not null; a row picked posts the choice, "Use another account" the
 * add, each row's sign-out and "Sign out all" their deletes, every `200`
 * a top-level navigation to the answered `next` because the session
 * cookie changes, a `204` and a `404` reading the list again, the `404`
 * and every other refusal drawn as the problem alert; the empty answer
 * draws the way to sign in.
 *
 * @param {Object} props - The router's side
 * @param {Object} props.session - The cookie session provider
 */
const SelectAccountPage = ({ session }) => {
  const { t } = useTranslation(['auth', 'shared']);
  const report = useProblemReporter();
  const [answer, setAnswer] = useState(null);
  const [problem, setProblem] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = t('accounts.title');
  }, [t]);

  useEffect(() => {
    let active = true;
    session
      .accounts()
      .then(result => {
        if (active) {
          setAnswer(result);
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
  }, [report, session]);

  const reread = () =>
    session
      .accounts()
      .then(setAnswer)
      .catch(error => setProblem(report(error)));

  const run = action => {
    setBusy(true);
    setProblem(null);
    return action().catch(error => {
      setBusy(false);
      setProblem(report(error));
      return reread();
    });
  };

  const signOut = account =>
    run(() =>
      session.signOutAccount(account).then(left => {
        if (!left) {
          setBusy(false);
          return reread();
        }
        return undefined;
      })
    );

  const accounts = answer?.accounts || [];

  return (
    <AuthShell title={t('accounts.title')} subtitle={t('accounts.subhead')}>
      {problem ? <ProblemAlert problem={problem} /> : null}
      {answer?.pending ? (
        <AuthAlert tone="info">
          {t('accounts.pending', { client: answer.pending.client_name })}
        </AuthAlert>
      ) : null}
      {!answer && !problem ? <AuthSpinner label={t('shared:loading')} /> : null}
      {answer && accounts.length > 0 ? (
        <>
          <AccountRows
            accounts={accounts}
            busy={busy}
            onPick={account => run(() => session.chooseAccount(account))}
            onSignOut={signOut}
            className="mb-3"
          />
          <div className="auth-form">
            <button
              type="button"
              className="auth-btn auth-btn-secondary auth-btn-block"
              data-action="add-account"
              disabled={busy}
              onClick={() => run(() => session.addAccount())}
            >
              {t('accounts.another')}
            </button>
            <button
              type="button"
              className="auth-btn auth-btn-secondary auth-btn-block"
              data-action="sign-out-all"
              disabled={busy}
              onClick={() => run(() => session.signOutAccounts())}
            >
              {t('accounts.signOutAll')}
            </button>
          </div>
        </>
      ) : null}
      {answer && accounts.length === 0 ? (
        <>
          <AuthAlert tone="info">{t('accounts.none')}</AuthAlert>
          <Link to="/login" className="auth-btn auth-btn-primary auth-btn-block">
            {t('login.signIn')}
          </Link>
        </>
      ) : null}
    </AuthShell>
  );
};

SelectAccountPage.propTypes = {
  session: PropTypes.object.isRequired,
};

export default SelectAccountPage;
