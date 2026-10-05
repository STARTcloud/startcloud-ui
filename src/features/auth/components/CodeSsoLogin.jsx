import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowUpRightFromSquare, FaRightToBracket, FaRotate } from 'react-icons/fa6';

import CopyButton from '../../../components/common/CopyButton';
import { codeSsoExchange, deviceSsoStatus } from '../api/agentSignIn';

const STORAGE_KEY = 'hyperweaver_code_sso';

const DEFAULT_EXPIRY_S = 300;

const SECOND_MS = 1000;

const forgetPending = () => sessionStorage.removeItem(STORAGE_KEY);

const pendingGrant = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (saved?.handle && saved.expiresAt > Date.now()) {
      return saved.grant;
    }
  } catch {
    forgetPending();
  }
  return null;
};

const messageOf = error => error?.data?.error || error?.message || '';

/**
 * The loopback authorization-code sign-in of an agent, RFC 8252 with the
 * agent as the client: Sign in via SSO mints a flow through `start`, the
 * provider's `begin({ method: 'code' })`, the authorize URL opens in a
 * new tab and the flow is kept in sessionStorage so a refreshed page
 * resumes it; on the agent's own machine the browser lands on the
 * agent's callback and the agent exchanges the code itself, and from
 * another machine the identity provider shows the code on its code page,
 * the person pastes it here and Continue hands it to the agent with the
 * flow's handle through `POST /api/auth/oidc/code`; the agent's answer is
 * read with `GET /api/auth/oidc/device-status`, one request the agent
 * holds open until the flow ends or its life runs out, asked as soon as
 * the flow is held and again after every `pending` answer, never on a
 * clock, and on Check status after a dropped connection; an approved flow
 * hands its key to `onSignIn`, a denied, failed or expired one, and a
 * handle already delivered, say so with Retry, and Back forgets the flow.
 */
const CodeSsoLogin = ({ disabled, onSignIn, start }) => {
  const { t } = useTranslation();
  const [grant, setGrant] = useState(pendingGrant);
  const [phase, setPhase] = useState(() => (pendingGrant() ? 'waiting' : 'idle'));
  const [error, setError] = useState('');
  const [pasted, setPasted] = useState('');
  const [sending, setSending] = useState(false);
  const checking = useRef(false);
  const waiting = useRef(false);
  const checkRef = useRef(null);

  const fail = message => {
    forgetPending();
    setGrant(null);
    setPhase('error');
    setError(message);
  };

  const check = async () => {
    if (!grant?.handle || checking.current) {
      return;
    }
    checking.current = true;
    let again = false;
    try {
      const answer = await deviceSsoStatus(grant.handle);
      if (answer?.status === 'approved' && answer.api_key) {
        forgetPending();
        setGrant(null);
        setPhase('idle');
        await onSignIn(answer.api_key);
      } else if (answer?.status === 'denied') {
        fail(t('auth.deviceSso.denied'));
      } else if (answer?.status === 'failed') {
        fail(t('auth.deviceSso.failed'));
      } else if (answer?.status === 'expired') {
        fail(t('auth.deviceSso.expired'));
      } else {
        again = true;
      }
    } catch (checkError) {
      if (checkError.status === 404) {
        fail(t('auth.deviceSso.expired'));
      }
    } finally {
      checking.current = false;
    }
    if (again && waiting.current) {
      checkRef.current();
    }
  };

  useEffect(() => {
    checkRef.current = check;
  });

  useEffect(() => {
    if (phase !== 'waiting') {
      return undefined;
    }
    waiting.current = true;
    checkRef.current();
    return () => {
      waiting.current = false;
    };
  }, [phase]);

  const begin = async () => {
    setPhase('starting');
    setError('');
    setPasted('');
    try {
      const data = (await start()) || {};
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          handle: data.handle,
          grant: data,
          expiresAt: Date.now() + (Number(data.expires_in) || DEFAULT_EXPIRY_S) * SECOND_MS,
        })
      );
      setGrant(data);
      setPhase('waiting');
      if (data.authorize_url) {
        window.open(data.authorize_url, '_blank');
      }
    } catch (startError) {
      setPhase('error');
      setError(messageOf(startError));
    }
  };

  const back = () => {
    forgetPending();
    setGrant(null);
    setPasted('');
    setPhase('idle');
    setError('');
  };

  const submit = async () => {
    const code = pasted.trim();
    if (!grant?.handle || !code) {
      return;
    }
    setSending(true);
    try {
      const answer = await codeSsoExchange(grant.handle, code);
      if (answer?.status === 'denied') {
        fail(t('auth.deviceSso.denied'));
      } else if (answer?.status === 'failed') {
        fail(t('auth.deviceSso.failed'));
      } else if (answer?.status === 'expired') {
        fail(t('auth.deviceSso.expired'));
      } else {
        await check();
      }
    } catch (sendError) {
      setError(messageOf(sendError) || t('auth.deviceSso.failed'));
    } finally {
      setSending(false);
    }
  };

  if (phase === 'waiting' && grant) {
    return (
      <div className="alert alert-info text-start mb-3" role="status" data-note="code-waiting">
        <p className="mb-2">{t('auth.codeSso.waiting')}</p>
        {grant.authorize_url ? (
          <>
            <p className="mb-1 small">{t('auth.codeSso.urlLabel')}</p>
            <div className="input-group input-group-sm mb-2">
              <input
                type="text"
                className="form-control font-monospace"
                aria-label={t('auth.codeSso.urlLabel')}
                value={grant.authorize_url}
                readOnly
                onFocus={event => event.target.select()}
              />
              <CopyButton
                text={grant.authorize_url}
                label={t('copyButton.copy')}
                className="btn btn-outline-secondary"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                data-action="code-open"
                onClick={() => window.open(grant.authorize_url, '_blank')}
              >
                <FaArrowUpRightFromSquare className="me-1" aria-hidden="true" />
                {t('auth.codeSso.openSignIn')}
              </button>
            </div>
          </>
        ) : null}
        <label className="form-label mb-1 small" htmlFor="ssoCode">
          {t('auth.codeSso.codeLabel')}
        </label>
        <input
          id="ssoCode"
          type="text"
          className="form-control form-control-sm font-monospace mb-2"
          autoComplete="off"
          placeholder={t('auth.codeSso.codePlaceholder')}
          value={pasted}
          onChange={event => setPasted(event.target.value)}
          disabled={sending}
        />
        {error ? (
          <p className="small text-danger mb-2" role="alert" data-note="code-error">
            {error}
          </p>
        ) : null}
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            data-action="code-continue"
            onClick={submit}
            disabled={sending || !pasted.trim()}
          >
            {t('auth.codeSso.continue')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            data-action="code-check"
            onClick={check}
            disabled={sending}
          >
            <FaRotate className="me-2" aria-hidden="true" />
            {t('auth.deviceSso.checkStatus')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-link"
            data-action="code-back"
            onClick={back}
            disabled={sending}
          >
            {t('auth.codeSso.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3">
      {phase === 'error' ? (
        <div className="alert alert-warning text-start py-2" role="alert" data-note="code-error">
          <p className="mb-0">{error}</p>
        </div>
      ) : null}
      <button
        type="button"
        className="btn btn-primary w-100"
        data-action="code-start"
        onClick={begin}
        disabled={disabled || phase === 'starting'}
      >
        <FaRightToBracket className="me-2" aria-hidden="true" />
        {t(phase === 'error' ? 'auth.deviceSso.retry' : 'auth.codeSso.signInWithSso')}
      </button>
      <div className="form-text text-muted">{t('auth.codeSso.desc')}</div>
    </div>
  );
};

CodeSsoLogin.propTypes = {
  disabled: PropTypes.bool.isRequired,
  onSignIn: PropTypes.func.isRequired,
  start: PropTypes.func.isRequired,
};

export default CodeSsoLogin;
