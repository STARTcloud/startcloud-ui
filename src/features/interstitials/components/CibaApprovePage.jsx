import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import AuthShell, { AuthAlert, AuthSpinner } from '../../../components/common/AuthShell';
import { httpsUrl } from '../../../components/common/MethodList';
import { DetailRow, authorizationDetailShape } from '../../../components/common/ScopeList';
import { useFallbackSrc } from '../../../components/common/useFallbackSrc';
import { brandLogoUrl, brandMarkUrl } from '../../../config/brand';
import { useStatus } from '../../../contexts/StatusContext';
import { useProblemReporter } from '../../../hooks/useProblemReporter';
import { sessionStateShape } from '../../../hooks/useSession';
import { useChosenTheme } from '../../../hooks/useTheme';
import { returnToShape } from '../../../utils/auth';
import { ciba as fetchCiba, cibaApprove, cibaDeny } from '../api/interstitials';

const REASONS = ['not_found', 'expired', 'wrong_user'];
const TOKEN_KEY = 'ciba_token';
const PATH = '/ciba/approve';
const OWN_PATH = /^\/(?![/\\])/u;

const logoOf = value =>
  httpsUrl(value) || (typeof value === 'string' && OWN_PATH.test(value) ? value : '');

const readToken = () => {
  const fromUrl = new URLSearchParams(window.location.search).get('token') || '';
  if (fromUrl) {
    sessionStorage.setItem(TOKEN_KEY, fromUrl);
    return fromUrl;
  }
  return sessionStorage.getItem(TOKEN_KEY) || '';
};

const forgetToken = () => sessionStorage.removeItem(TOKEN_KEY);

const requestPath = token => `${PATH}?token=${encodeURIComponent(token)}`;

/**
 * The circle over the page: the client's own logo while the answer carries
 * a `client_logo` that is an `https:` URL or a path of the serving origin,
 * the host's mark otherwise, the chosen theme's while one carries a mark,
 * and a client logo that fails to load swapped once to the host's mark.
 */
const ClientIcon = ({ logo }) => {
  const { brand } = useStatus();
  const { theme, themes } = useChosenTheme();
  const { src, onError } = useFallbackSrc(
    logo || brandMarkUrl(brand, theme, themes),
    brandLogoUrl(brand)
  );
  return (
    <div className="auth-icon-circle" aria-hidden="true">
      <img className="auth-icon-logo" src={src} onError={onError} alt="" />
    </div>
  );
};

ClientIcon.propTypes = {
  logo: PropTypes.string.isRequired,
};

/**
 * The facts of a sign-in request, one card at the centre of the page: its
 * authorization details as large rows, each field a line with its label
 * and value, or, while it carries none, the question the page builds from
 * the client's name; under the card the client's `binding_message` as a
 * critical notice only while it sends one, because the module's own words
 * reach the page only when it has something urgent to say.
 */
const CibaRequest = ({ answer }) => {
  const { t } = useTranslation(['auth']);
  const details = answer.authorization_details || [];
  return (
    <>
      {details.length > 0 ? (
        <div className="scope-list">
          {details.map(detail => (
            <DetailRow key={`${detail.type}-${detail.identifier || ''}`} detail={detail} large />
          ))}
        </div>
      ) : (
        <div className="scope-row scope-row-large">
          <span>
            <span className="scope-row-ask">{t('ciba.allow', { client: answer.client_name })}</span>
          </span>
        </div>
      )}
      {answer.binding_message ? (
        <div className="auth-critical" role="alert">
          {answer.binding_message}
        </div>
      ) : null}
    </>
  );
};

CibaRequest.propTypes = {
  answer: PropTypes.shape({
    client_name: PropTypes.string,
    binding_message: PropTypes.string,
    authorization_details: PropTypes.arrayOf(authorizationDetailShape),
  }).isRequired,
};

/**
 * `/ciba/approve`: reads the token from the URL once, keeps it in
 * `sessionStorage` until the request is read so a reload before that
 * still names the request, replaces the location with the bare path and
 * sends the token in the `X-Ciba-Token` header; draws the client's logo
 * or the host's mark, "Sign-in request", the client's name, the request's
 * facts, Deny and Approve side by side and "Approve only if you started
 * this." under them, then "Sign-in approved" or "Sign-in denied" in place;
 * a visitor without a session, and a `401` on the read or the decision,
 * are sent to sign in with this page and its token as the return path,
 * so the sign-in lands them back on the same request; `not_found`,
 * `expired` and `wrong_user` draw the unavailable state with the reason,
 * and any other failure is the reporter's danger notice with the page
 * kept.
 *
 * @param {Object} props - The router's side
 * @param {Object} props.account - The session state from `useSession`
 * @param {Object} props.returnTo - The helper from `createReturnTo`
 */
const CibaApprovePage = ({ account, returnTo }) => {
  const { t } = useTranslation(['auth', 'shared']);
  const navigate = useNavigate();
  const report = useProblemReporter();
  const [token] = useState(readToken);
  const [answer, setAnswer] = useState(null);
  const [outcome, setOutcome] = useState('');
  const [reason, setReason] = useState(() => (token ? '' : 'not_found'));
  const [busy, setBusy] = useState(false);
  const { loaded, user } = account;
  const signedIn = loaded && Boolean(user);

  useEffect(() => {
    document.title = t('ciba.title');
  }, [t]);

  const signIn = useCallback(
    () => navigate(returnTo.signInTo(requestPath(token))),
    [navigate, returnTo, token]
  );

  const failed = useCallback(
    error => {
      if (error?.status === 401) {
        signIn();
        return;
      }
      const problem = report(error);
      if (problem && REASONS.includes(problem.code)) {
        setReason(problem.code);
      }
    },
    [report, signIn]
  );

  useEffect(() => {
    if (loaded && !user) {
      signIn();
    }
  }, [loaded, signIn, user]);

  useEffect(() => {
    if (!signedIn) {
      return undefined;
    }
    navigate(PATH, { replace: true });
    let active = true;
    if (!token) {
      return undefined;
    }
    fetchCiba(token)
      .then(result => {
        if (active) {
          forgetToken();
          setAnswer(result);
        }
      })
      .catch(error => {
        if (active) {
          failed(error);
        }
      });
    return () => {
      active = false;
    };
  }, [failed, navigate, signedIn, token]);

  const decide = action => {
    setBusy(true);
    action(token)
      .then(result => setOutcome(result?.status === 'approved' ? 'approved' : 'denied'))
      .catch(error => {
        setBusy(false);
        failed(error);
      });
  };

  if (!signedIn) {
    return null;
  }

  if (reason) {
    return (
      <AuthShell title={t('ciba.unavailable')}>
        <AuthAlert tone="danger">{t(`ciba.reason.${reason}`)}</AuthAlert>
      </AuthShell>
    );
  }

  if (outcome) {
    return <AuthShell title={t(`ciba.${outcome}`)} />;
  }

  return (
    <AuthShell
      title={t('ciba.title')}
      subtitle={answer ? answer.client_name : ''}
      icon={<ClientIcon logo={logoOf(answer?.client_logo)} />}
    >
      {!answer ? <AuthSpinner label={t('shared:loading')} /> : null}
      {answer ? (
        <>
          <CibaRequest answer={answer} />
          <div className="auth-actions">
            <button
              type="button"
              className="auth-btn auth-btn-secondary"
              disabled={busy}
              onClick={() => decide(cibaDeny)}
            >
              {t('consent.deny')}
            </button>
            <button
              type="button"
              className={`auth-btn auth-btn-primary${busy ? ' is-loading' : ''}`}
              disabled={busy}
              onClick={() => decide(cibaApprove)}
            >
              {t('consent.approve')}
            </button>
          </div>
          <p className="auth-foot">{t('ciba.started')}</p>
        </>
      ) : null}
    </AuthShell>
  );
};

CibaApprovePage.propTypes = {
  account: sessionStateShape.isRequired,
  returnTo: returnToShape.isRequired,
};

export default CibaApprovePage;
