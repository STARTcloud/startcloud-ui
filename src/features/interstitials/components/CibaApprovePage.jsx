import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import AuthShell, { AuthAlert, AuthSpinner } from '../../../components/common/AuthShell';
import ScopeList, { DetailRow } from '../../../components/common/ScopeList';
import { useProblemReporter } from '../../../hooks/useProblemReporter';
import { ciba as fetchCiba, cibaApprove, cibaDeny } from '../api/interstitials';

const REASONS = ['not_found', 'expired', 'wrong_user'];

const readToken = () => new URLSearchParams(window.location.search).get('token') || '';

const scopeRows = (scopes, t) =>
  (scopes || []).map(scope => {
    const id = typeof scope === 'string' ? scope : scope.id;
    return {
      id,
      label: typeof scope === 'string' ? scope : scope.label || id,
      description:
        (typeof scope === 'object' && scope.description) ||
        t([`consent.scope.${id}`, 'consent.scope.unknown'], { scope: id }),
    };
  });

/**
 * `/ciba/approve`: reads the token from the URL once and sends it in the
 * `X-Ciba-Token` header, draws the client, the binding message to compare,
 * the scope and detail rows, Approve and Deny, then "Sign-in approved" or
 * "Sign-in denied" in place; a problem `code` draws the unavailable state
 * with its reason.
 */
const CibaApprovePage = () => {
  const { t } = useTranslation(['auth', 'shared']);
  const navigate = useNavigate();
  const report = useProblemReporter();
  const [token] = useState(readToken);
  const [answer, setAnswer] = useState(null);
  const [outcome, setOutcome] = useState('');
  const [reason, setReason] = useState(() => (token ? '' : 'not_found'));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = t('ciba.title');
  }, [t]);

  useEffect(() => {
    navigate('/ciba/approve', { replace: true });
    let active = true;
    if (!token) {
      return undefined;
    }
    fetchCiba(token)
      .then(result => {
        if (active) {
          setAnswer(result);
        }
      })
      .catch(error => {
        if (!active) {
          return;
        }
        const problem = report(error);
        setReason(problem ? problem.code : 'not_found');
      });
    return () => {
      active = false;
    };
  }, [navigate, report, token]);

  const decide = action => {
    setBusy(true);
    action(token)
      .then(result => setOutcome(result?.status === 'approved' ? 'approved' : 'denied'))
      .catch(error => {
        setBusy(false);
        const problem = report(error);
        setReason(problem ? problem.code : 'not_found');
      });
  };

  if (reason) {
    return (
      <AuthShell title={t('ciba.unavailable')}>
        <AuthAlert tone="danger">
          {t(REASONS.includes(reason) ? `ciba.reason.${reason}` : 'errors.authenticationFailed')}
        </AuthAlert>
      </AuthShell>
    );
  }

  if (outcome) {
    return <AuthShell title={t(`ciba.${outcome}`)} />;
  }

  return (
    <AuthShell
      title={t('ciba.title')}
      subtitle={answer ? t('ciba.subhead', { client: answer.client_name }) : ''}
    >
      {!answer ? <AuthSpinner label={t('shared:loading')} /> : null}
      {answer ? (
        <>
          {answer.binding_message ? (
            <AuthAlert tone="info">
              {t('ciba.match', { message: answer.binding_message })}
            </AuthAlert>
          ) : null}
          <p className="auth-group">{t('consent.willBeAbleTo')}</p>
          <ScopeList scopes={scopeRows(answer.scopes, t)} checked={[]} readOnly />
          {answer.authorization_details?.length > 0 ? (
            <>
              <p className="auth-group">{t('consent.specificAccess')}</p>
              <div className="scope-list">
                {answer.authorization_details.map(detail => (
                  <DetailRow key={`${detail.type}-${detail.identifier || ''}`} detail={detail} />
                ))}
              </div>
            </>
          ) : null}
          <button
            type="button"
            className={`auth-btn auth-btn-primary auth-btn-block${busy ? ' is-loading' : ''}`}
            disabled={busy}
            onClick={() => decide(cibaApprove)}
          >
            {t('consent.approve')}
          </button>
          <button
            type="button"
            className="auth-btn auth-btn-secondary auth-btn-block"
            disabled={busy}
            onClick={() => decide(cibaDeny)}
          >
            {t('consent.deny')}
          </button>
        </>
      ) : null}
    </AuthShell>
  );
};

export default CibaApprovePage;
