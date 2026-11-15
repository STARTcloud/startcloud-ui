import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import AuthShell, { AuthAlert, AuthSpinner } from '../../../components/common/AuthShell';
import ScopeList, {
  DetailRow,
  authorizationDetailShape,
} from '../../../components/common/ScopeList';
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
 * The facts of a sign-in request under the lead line "Approve only if you
 * started this": its authorization details as large rows with the scope
 * list folded away, or, while it carries none, its binding message in the
 * same large block above the scope rows.
 */
const CibaRequest = ({ answer }) => {
  const { t } = useTranslation(['auth']);
  const details = answer.authorization_details || [];
  if (details.length > 0) {
    return (
      <>
        <p className="auth-group">{t('ciba.started')}</p>
        <div className="scope-list">
          {details.map(detail => (
            <DetailRow key={`${detail.type}-${detail.identifier || ''}`} detail={detail} large />
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      {answer.binding_message ? (
        <>
          <p className="auth-group">{t('ciba.started')}</p>
          <div className="scope-row scope-row-large">
            <span>
              <span className="scope-row-value">{answer.binding_message}</span>
            </span>
          </div>
        </>
      ) : null}
      <p className="auth-group">{t('consent.willBeAbleTo')}</p>
      <ScopeList scopes={scopeRows(answer.scopes, t)} checked={[]} readOnly />
    </>
  );
};

CibaRequest.propTypes = {
  answer: PropTypes.shape({
    binding_message: PropTypes.string,
    scopes: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.object])),
    authorization_details: PropTypes.arrayOf(authorizationDetailShape),
  }).isRequired,
};

/**
 * `/ciba/approve`: reads the token from the URL once and sends it in the
 * `X-Ciba-Token` header, draws the client, the request's facts, Approve and
 * Deny, then "Sign-in approved" or "Sign-in denied" in place; a problem
 * `code` draws the unavailable state with its reason.
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
          <CibaRequest answer={answer} />
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
