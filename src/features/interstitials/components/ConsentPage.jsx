import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import FieldError from '../../../components/common/FieldError';
import NativeForm from '../../../components/common/NativeForm';
import ScopeList, { DetailRow } from '../../../components/common/ScopeList';
import { returnToShape } from '../../../utils/auth';
import { cancelSignIn } from '../../auth/api/signin';
import AuthShell, { AuthSpinner } from '../../auth/components/AuthShell';
import ProblemAlert from '../../auth/components/ProblemAlert';
import { followNext } from '../../auth/next';
import { useProblemReporter } from '../../auth/problem';
import { consent as fetchConsent } from '../api/interstitials';

const LOCKED = ['openid'];
const QUERY = ['client_id', 'scope', 'state', 'user_code'];

const scopeRows = (scopes, t) =>
  (scopes || []).map(scope => ({
    id: scope.id,
    label: scope.label || scope.id,
    description:
      scope.description ||
      t([`consent.scope.${scope.id}`, 'consent.scope.unknown'], { scope: scope.id }),
  }));

/**
 * `/oauth2/consent`: the client, the scopes as checked rows with `openid`
 * locked, the authorization details, Approve and Deny as one real form
 * post to the answer's `action` through `NativeForm`, Approve refusing
 * inline while no scope is checked, and "You are logged in as … Not you?
 * Sign out", which signs out and posts `/auth-cancel`.
 */
const ConsentPage = ({ session, returnTo }) => {
  const { t } = useTranslation(['auth', 'shared']);
  const navigate = useNavigate();
  const location = useLocation();
  const report = useProblemReporter();
  const params = useMemo(() => {
    const search = new URLSearchParams(location.search);
    return Object.fromEntries(QUERY.map(key => [key, search.get(key) || '']).filter(([, v]) => v));
  }, [location.search]);
  const [answer, setAnswer] = useState(null);
  const [problem, setProblem] = useState(null);
  const [checked, setChecked] = useState([]);
  const [noScope, setNoScope] = useState(false);

  useEffect(() => {
    document.title = t('consent.title');
  }, [t]);

  useEffect(() => {
    let active = true;
    fetchConsent(params)
      .then(result => {
        if (!active) {
          return;
        }
        if (result?.next) {
          followNext({ next: result.next, navigate, returnTo });
          return;
        }
        setAnswer(result);
        setChecked((result.scopes || []).map(scope => scope.id));
      })
      .catch(error => {
        if (active) {
          setProblem(report(error));
        }
      });
    return () => {
      active = false;
    };
  }, [navigate, params, report, returnTo]);

  const toggle = id =>
    setChecked(current =>
      current.includes(id) ? current.filter(entry => entry !== id) : [...current, id]
    );

  const submit = event => {
    const decision = event.nativeEvent.submitter?.value;
    if (decision === 'deny') {
      event.currentTarget.querySelectorAll('input[name="scope"]').forEach(input => {
        input.disabled = true;
      });
      return;
    }
    if (checked.length === 0) {
      event.preventDefault();
      setNoScope(true);
    }
  };

  const signOut = () =>
    Promise.resolve(session.signOut())
      .then(() => cancelSignIn())
      .catch(() => null);

  const scopes = answer ? scopeRows(answer.scopes, t) : [];
  const details = answer?.authorization_details || [];

  return (
    <AuthShell
      title={t('consent.title')}
      subtitle={answer ? t('consent.subhead', { client: answer.client_name }) : ''}
    >
      {problem ? <ProblemAlert problem={problem} /> : null}
      {!answer && !problem ? <AuthSpinner label={t('shared:loading')} /> : null}
      {answer ? (
        <NativeForm
          action={answer.action}
          fields={{
            client_id: answer.client_id,
            state: answer.state || '',
            user_code: answer.user_code || '',
          }}
          onSubmit={submit}
        >
          {answer.consent_text ? <p className="auth-note">{answer.consent_text}</p> : null}
          <p className="auth-group">{t('consent.willBeAbleTo')}</p>
          <ScopeList scopes={scopes} checked={checked} onToggle={toggle} locked={LOCKED} />
          {noScope && checked.length === 0 ? (
            <FieldError id="consent-no-scope" message={t('consent.noScope')} />
          ) : null}
          {details.length > 0 ? (
            <>
              <p className="auth-group">{t('consent.specificAccess')}</p>
              <div className="scope-list">
                {details.map(detail => (
                  <DetailRow key={`${detail.type}-${detail.identifier || ''}`} detail={detail} />
                ))}
              </div>
            </>
          ) : null}
          <button
            type="submit"
            name="authorization_details_decision"
            value="approve"
            className="auth-btn auth-btn-primary auth-btn-block"
          >
            {t('consent.approve')}
          </button>
          <button
            type="submit"
            name="authorization_details_decision"
            value="deny"
            className="auth-btn auth-btn-secondary auth-btn-block"
          >
            {t('consent.deny')}
          </button>
        </NativeForm>
      ) : null}
      {answer ? (
        <p className="auth-foot">
          {t('consent.signedInAs', { principal: answer.principal })} {t('consent.notYou')}{' '}
          <button type="button" className="auth-link" onClick={signOut}>
            {t('shared:navbar.logout')}
          </button>
        </p>
      ) : null}
    </AuthShell>
  );
};

ConsentPage.propTypes = {
  session: PropTypes.object.isRequired,
  returnTo: returnToShape.isRequired,
};

export default ConsentPage;
