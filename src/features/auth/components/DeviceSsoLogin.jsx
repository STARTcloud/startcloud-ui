import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowUpRightFromSquare, FaRightToBracket, FaRotate } from 'react-icons/fa6';

import { deviceSsoStatus } from '../api/agentSignIn';

const STORAGE_KEY = 'hyperweaver_device_sso';

const DEFAULT_EXPIRY_S = 600;

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
 * The device-flow sign-in of an agent, hyperweaver-ui's `DeviceSsoLogin`
 * behind the `oidc` word of the status, RFC 8628 with the agent as the
 * client: Start mints a grant through `start`, the provider's
 * `begin({ method: 'device' })`, the verification page opens in a new
 * tab, and the grant is kept in sessionStorage so a refreshed page
 * resumes it; the agent's answer is read with
 * `GET /api/auth/oidc/device-status` when the person comes back to this
 * tab, the window's `focus`, and on Check status, never on a clock,
 * hyperweaver-ui's three-second poll not carried over; an approved
 * grant hands its key to `onSignIn`, a denied, failed or expired one,
 * and a handle already delivered, say so with Retry.
 */
const DeviceSsoLogin = ({ disabled, onSignIn, start }) => {
  const { t } = useTranslation();
  const [grant, setGrant] = useState(pendingGrant);
  const [phase, setPhase] = useState(() => (pendingGrant() ? 'waiting' : 'idle'));
  const [error, setError] = useState('');
  const checking = useRef(false);

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
      }
    } catch (checkError) {
      if (checkError.status === 404) {
        fail(t('auth.deviceSso.expired'));
      }
    } finally {
      checking.current = false;
    }
  };

  const checkRef = useRef(check);
  useEffect(() => {
    checkRef.current = check;
  });

  useEffect(() => {
    if (phase !== 'waiting') {
      return undefined;
    }
    const onFocus = () => checkRef.current();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [phase]);

  const begin = async () => {
    setPhase('starting');
    setError('');
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
      if (data.verification_uri_complete) {
        window.open(data.verification_uri_complete, '_blank');
      }
    } catch (startError) {
      setPhase('error');
      setError(messageOf(startError));
    }
  };

  if (phase === 'waiting' && grant) {
    const verification = grant.verification_uri_complete || grant.verification_uri;
    return (
      <div className="alert alert-info text-start mb-3" role="status" data-note="device-waiting">
        <p className="mb-2">{t('auth.deviceSso.waitingApproval')}</p>
        {grant.user_code ? (
          <p className="mb-2">
            {t('auth.deviceSso.codeLabel')}{' '}
            <code className="fs-5 user-select-all">{grant.user_code}</code>
          </p>
        ) : null}
        <div className="d-flex flex-wrap gap-2">
          {verification ? (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              data-action="device-open"
              onClick={() => window.open(verification, '_blank')}
            >
              <FaArrowUpRightFromSquare className="me-2" aria-hidden="true" />
              {t('auth.deviceSso.openVerification')}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            data-action="device-check"
            onClick={check}
          >
            <FaRotate className="me-2" aria-hidden="true" />
            {t('auth.deviceSso.checkStatus')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3">
      {phase === 'error' ? (
        <div className="alert alert-warning text-start py-2" role="alert" data-note="device-error">
          <p className="mb-0">{error}</p>
        </div>
      ) : null}
      <button
        type="button"
        className="btn btn-primary w-100"
        data-action="device-start"
        onClick={begin}
        disabled={disabled || phase === 'starting'}
      >
        <FaRightToBracket className="me-2" aria-hidden="true" />
        {t(phase === 'error' ? 'auth.deviceSso.retry' : 'auth.deviceSso.signInWithSso')}
      </button>
      <div className="form-text text-muted">{t('auth.deviceSso.desc')}</div>
    </div>
  );
};

DeviceSsoLogin.propTypes = {
  disabled: PropTypes.bool.isRequired,
  onSignIn: PropTypes.func.isRequired,
  start: PropTypes.func.isRequired,
};

export default DeviceSsoLogin;
