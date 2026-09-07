import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import CodeInput from '../../../components/common/CodeInput';
import PasswordField from '../../../components/common/PasswordField';
import { returnToShape } from '../../../utils/auth';
import AuthShell, { AuthSpinner } from '../../auth/components/AuthShell';
import ProblemAlert, { useWait } from '../../auth/components/ProblemAlert';
import { followNext } from '../../auth/next';
import { useProblemReporter } from '../../auth/problem';
import { linkConfirm, linkState } from '../api/interstitials';

const FIELD_CODES = ['bad_password', 'invalid_code'];

/**
 * `/link-account-consent`: "Link Your Account", the existing account, the
 * provider, the current password while `proof` is `password` and the
 * mailed code while it is `code`, "Link {{provider}} Account" posting the
 * proof and following `next`, Cancel declining, and the fine print;
 * nothing pending draws the danger alert with a link to sign in.
 */
const LinkAccountPage = ({ returnTo }) => {
  const { t } = useTranslation(['auth', 'shared']);
  const navigate = useNavigate();
  const report = useProblemReporter();
  const [answer, setAnswer] = useState(null);
  const [problem, setProblem] = useState(null);
  const [proof, setProof] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const wait = useWait(problem);

  useEffect(() => {
    document.title = t('link.title');
  }, [t]);

  useEffect(() => {
    let active = true;
    linkState()
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
  }, [report]);

  const send = body => {
    setBusy(true);
    setProblem(null);
    linkConfirm(body)
      .then(result => followNext({ next: result?.next, navigate, returnTo }))
      .catch(error => {
        setBusy(false);
        setProblem(report(error));
      });
  };

  const submit = event => {
    event.preventDefault();
    if (!proof || wait > 0) {
      return;
    }
    send(
      answer.proof === 'code'
        ? { action: 'link', code: proof }
        : { action: 'link', current_password: proof }
    );
  };

  const fieldError =
    problem && FIELD_CODES.includes(problem.code) ? t(`errors.${problem.code}`) : '';
  const invalid = problem?.code === 'invalid_linking_session';

  return (
    <AuthShell
      title={t('link.title')}
      subtitle={answer ? t('link.exists', { email: answer.email }) : ''}
    >
      {problem && !fieldError ? <ProblemAlert problem={problem} /> : null}
      {invalid ? (
        <Link to="/login" className="auth-btn auth-btn-secondary auth-btn-block">
          {t('login.signIn')}
        </Link>
      ) : null}
      {!answer && !problem ? <AuthSpinner label={t('shared:loading')} /> : null}
      {answer ? (
        <>
          <p className="auth-hint">
            {t('link.either', {
              provider: answer.provider_name,
              username: answer.provider_username,
            })}
          </p>
          <div className="auth-ack">
            <span>
              <strong>{answer.account?.name}</strong>
              <br />
              {answer.account?.email} ·{' '}
              <span className="auth-badge">
                {answer.has_local_auth ? t('link.localMethod') : answer.provider_name}
              </span>
            </span>
          </div>
          <form className="auth-form" onSubmit={submit} noValidate>
            {answer.proof === 'code' ? (
              <CodeInput
                id="link-code"
                label={t('link.code')}
                value={proof}
                onChange={setProof}
                disabled={busy}
                error={fieldError}
              />
            ) : (
              <PasswordField
                id="link-password"
                name="current_password"
                label={t('link.password')}
                value={proof}
                onChange={event => setProof(event.target.value)}
                onBlur={() => null}
                error={fieldError}
                hint={t('link.passwordHint')}
                autoComplete="current-password"
                revealed={revealed}
                onToggleReveal={() => setRevealed(visible => !visible)}
              />
            )}
            <button
              type="submit"
              className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
              disabled={busy || wait > 0}
            >
              {t('link.confirm', { provider: answer.provider_name })}
            </button>
            <button
              type="button"
              className="auth-btn auth-btn-secondary auth-btn-block"
              disabled={busy}
              onClick={() => send({ action: 'cancel' })}
            >
              {t('link.cancel')}
            </button>
          </form>
          <p className="auth-hint auth-center">{t('link.finePrint')}</p>
        </>
      ) : null}
    </AuthShell>
  );
};

LinkAccountPage.propTypes = {
  returnTo: returnToShape.isRequired,
};

export default LinkAccountPage;
