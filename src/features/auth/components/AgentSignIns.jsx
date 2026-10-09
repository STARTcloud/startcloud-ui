import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthAlert } from '../../../components/common/AuthShell';
import CopyButton from '../../../components/common/CopyButton';
import RevealInput from '../../../components/common/RevealInput';
import { log } from '../../../lib/logger';
import { bootstrapFirstKey } from '../api/agentSignIn';
import { agentSignInsOf, isLoopback } from '../utils/agentSignIns';

import CodeSsoLogin from './CodeSsoLogin';

// Do not change this scheme without reading docs/guides/universal-deploy.md, "The agent's scheme".
const DESKTOP_HANDOFF = 'hwa://open';

const SSO_UNAVAILABLE = 'unavailable';

const messageOf = error => error?.data?.msg || error?.data?.message || error?.message || '';

let silentProbeStarted = false;

const BootstrapForm = ({ token, onToken, onBootstrap, onShowKeyEntry, loading }) => {
  const { t } = useTranslation();
  return (
    <div className="alert alert-info text-start" data-note="first-boot">
      <p className="mb-2">
        <strong>{t('auth.login.firstBootTitle')}</strong> {t('auth.login.firstBootDesc')}
      </p>
      <label className="form-label" htmlFor="setupToken">
        {t('auth.login.setupTokenLabel')}
      </label>
      <input
        id="setupToken"
        type="text"
        className="form-control font-monospace mb-2"
        autoComplete="off"
        placeholder={t('auth.login.setupTokenPlaceholder')}
        value={token}
        onChange={event => onToken(event.target.value)}
        disabled={loading}
      />
      <button
        type="button"
        className="btn btn-sm btn-success w-100"
        data-action="bootstrap"
        onClick={onBootstrap}
        disabled={loading || !token.trim()}
      >
        {t('auth.login.generateFirstKeyBtn')}
      </button>
      <button
        type="button"
        className="btn btn-link btn-sm w-100 mt-1"
        data-action="have-key"
        onClick={onShowKeyEntry}
        disabled={loading}
      >
        {t('auth.login.alreadyHaveKeyBtn')}
      </button>
    </div>
  );
};

BootstrapForm.propTypes = {
  token: PropTypes.string.isRequired,
  onToken: PropTypes.func.isRequired,
  onBootstrap: PropTypes.func.isRequired,
  onShowKeyEntry: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

const BootstrappedKey = ({ apiKey, onContinue }) => {
  const { t } = useTranslation();
  return (
    <div className="text-start" data-note="bootstrapped-key">
      <h2 className="h5 text-center mb-3">{t('auth.login.yourApiKeyTitle')}</h2>
      <div className="alert alert-warning" role="alert">
        <p className="mb-0">{t('auth.login.saveKeyWarning')}</p>
      </div>
      <div className="input-group mb-3">
        <input
          type="text"
          className="form-control font-monospace"
          aria-label={t('auth.login.yourApiKeyTitle')}
          value={apiKey}
          readOnly
          onFocus={event => event.target.select()}
        />
        <CopyButton
          text={apiKey}
          label={t('auth.login.copyToClipboard')}
          className="btn btn-outline-secondary"
        />
      </div>
      <button
        type="button"
        className="btn btn-primary w-100"
        data-action="key-saved"
        onClick={onContinue}
      >
        {t('auth.login.savedContinueBtn')}
      </button>
    </div>
  );
};

BootstrappedKey.propTypes = {
  apiKey: PropTypes.string.isRequired,
  onContinue: PropTypes.func.isRequired,
};

const ApiKeyForm = ({ hostname, apiKey, onApiKey, onSubmit, loading }) => {
  const { t } = useTranslation();
  return (
    <form
      className="mb-3 text-start"
      data-form="api-key"
      onSubmit={event => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="form-label" htmlFor="apiKey">
        {t('auth.login.apiKeyLabel')}
      </label>
      <input
        type="text"
        name="username"
        autoComplete="username"
        value={hostname}
        readOnly
        className="d-none"
        aria-hidden="true"
        tabIndex={-1}
      />
      <RevealInput
        id="apiKey"
        name="apiKey"
        className="form-control font-monospace"
        autoComplete="current-password"
        placeholder={t('auth.login.apiKeyPlaceholder')}
        value={apiKey}
        onChange={event => onApiKey(event.target.value)}
        disabled={loading}
      />
      <div className="form-text text-muted">{t('auth.login.generateKeysHelpText')}</div>
      <button
        type="submit"
        className="btn btn-primary w-100 mt-3"
        data-action="api-key-sign-in"
        disabled={loading || !apiKey.trim()}
      >
        {t('auth.login.loginBtn')}
      </button>
    </form>
  );
};

ApiKeyForm.propTypes = {
  hostname: PropTypes.string.isRequired,
  apiKey: PropTypes.string.isRequired,
  onApiKey: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

const silentProbeOf = ({ session, offered, loopback, silentSsoKey, urlParams }) => {
  const bounced = urlParams.get('sso') === SSO_UNAVAILABLE;
  const wanted = offered.sso && loopback && !bounced;
  return () => {
    if (!wanted || silentProbeStarted || sessionStorage.getItem(silentSsoKey)) {
      return;
    }
    if (session.restore()) {
      return;
    }
    silentProbeStarted = true;
    sessionStorage.setItem(silentSsoKey, '1');
    session
      .begin({ method: 'silent' })
      .catch(error => log.auth.error('Silent SSO probe failed', { error: error.message }));
  };
};

/**
 * The sign-ins of hyperweaver-agent on the shared sign-in page, the
 * paths of the agent's own brief through the `apikey` provider: Login
 * with SSO, the authorization-code flow behind the `oidc` word and the
 * `oidc-code` token, the authorize URL opened in a new tab and a code
 * from the provider's code page pasted back when the browser never
 * reached the agent, the approved flow signed in with through
 * `session.adopt()`, with the key form demoted behind Use an API key
 * instead; Login Locally, the desktop sign-in button on a loopback page,
 * `hwa://open` on the click alone; the API key form, the pasted key
 * handed to the agent's session through `session.login`; the first-boot
 * bootstrap while the status says `bootstrapAvailable`, the key generated
 * with `POST /api/api-keys/bootstrap` under the `setup_token`, shown once
 * and signed in with on Saved, continue; the tray hand-off, a `#tray=`
 * token claimed through `session.complete()`, once per page load with the
 * fragment stripped first, a cached session that still validates
 * outranking the claim; and on a loopback page that offers the SSO the one silent
 * probe per browser session, `session.begin({ method: 'silent' })`, run
 * once the claim has answered nothing and never from the
 * `?sso=unavailable` bounce, which draws the chooser with a quiet line
 * instead.
 */
const AgentSignIns = ({ status, session, silentSsoKey, urlParams, onSignedIn }) => {
  const { t } = useTranslation();
  const offered = agentSignInsOf(status);
  const loopback = isLoopback(window.location.hostname);
  const [apiKey, setApiKey] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [showKeyEntry, setShowKeyEntry] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(!offered.sso);
  const [bootstrappedKey, setBootstrappedKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    urlParams.get('sso') === SSO_UNAVAILABLE ? t('auth.login.ssoUnavailableMsg') : ''
  );
  const [tone, setTone] = useState('info');
  const signedIn = useRef(onSignedIn);
  const probe = silentProbeOf({ session, offered, loopback, silentSsoKey, urlParams });
  const probeRef = useRef(probe);
  useEffect(() => {
    signedIn.current = onSignedIn;
    probeRef.current = probe;
  });

  const say = (text, kind = 'danger') => {
    setMessage(text);
    setTone(kind);
  };

  const signInThrough = async step => {
    setLoading(true);
    try {
      await step();
      signedIn.current();
      return true;
    } catch (error) {
      say(messageOf(error) || t('app.authContext.invalidApiKey'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signInWithKey = key => signInThrough(() => session.login(key));

  const signInApproved = () => signInThrough(() => session.adopt());

  useEffect(() => {
    session
      .complete()
      .then(claimed => {
        if (claimed) {
          signedIn.current();
          return;
        }
        probeRef.current();
      })
      .catch(error => log.auth.error('Tray token claim failed', { error: error.message }));
  }, [session]);

  const bootstrap = async () => {
    setLoading(true);
    try {
      const answer = await bootstrapFirstKey(setupToken.trim());
      if (!answer?.api_key) {
        say(t('app.authContext.bootstrapNoKeyReturned'));
        return;
      }
      setBootstrappedKey(answer.api_key);
    } catch (error) {
      say(messageOf(error) || t('app.authContext.bootstrapFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (bootstrappedKey) {
    return (
      <BootstrappedKey apiKey={bootstrappedKey} onContinue={() => signInWithKey(bootstrappedKey)} />
    );
  }

  const firstBoot = offered.bootstrap && !showKeyEntry;
  const keyEntry = offered.apiKey && (!offered.sso || showKeyForm);

  return (
    <div data-panel="agent-sign-ins">
      {message ? <AuthAlert tone={tone}>{message}</AuthAlert> : null}
      {offered.sso ? (
        <CodeSsoLogin
          disabled={loading}
          onSignIn={signInApproved}
          start={() => session.begin({ method: 'code' })}
        />
      ) : null}
      {offered.tray && loopback ? (
        <div className="mb-3">
          <button
            type="button"
            className="btn btn-outline-secondary w-100"
            data-action="desktop-sign-in"
            onClick={() => window.location.assign(DESKTOP_HANDOFF)}
            disabled={loading}
          >
            {t('auth.login.signInWithDesktopBtn')}
          </button>
          <div className="form-text text-muted">{t('auth.login.desktopAgentDesc')}</div>
        </div>
      ) : null}
      {keyEntry && firstBoot ? (
        <BootstrapForm
          token={setupToken}
          onToken={setSetupToken}
          onBootstrap={bootstrap}
          onShowKeyEntry={() => setShowKeyEntry(true)}
          loading={loading}
        />
      ) : null}
      {keyEntry && !firstBoot ? (
        <ApiKeyForm
          hostname={status.hostname || window.location.hostname}
          apiKey={apiKey}
          onApiKey={setApiKey}
          onSubmit={() => signInWithKey(apiKey)}
          loading={loading}
        />
      ) : null}
      {offered.apiKey && offered.sso && !showKeyForm ? (
        <div className="mb-3">
          <button
            type="button"
            className="btn btn-link btn-sm p-0"
            data-action="use-api-key"
            onClick={() => setShowKeyForm(true)}
          >
            {t('auth.login.useApiKeyInstead')}
          </button>
        </div>
      ) : null}
    </div>
  );
};

AgentSignIns.propTypes = {
  status: PropTypes.object.isRequired,
  session: PropTypes.shape({
    login: PropTypes.func.isRequired,
    adopt: PropTypes.func.isRequired,
    begin: PropTypes.func.isRequired,
    complete: PropTypes.func.isRequired,
    restore: PropTypes.func.isRequired,
  }).isRequired,
  silentSsoKey: PropTypes.string.isRequired,
  urlParams: PropTypes.instanceOf(URLSearchParams).isRequired,
  onSignedIn: PropTypes.func.isRequired,
};

export default AgentSignIns;
