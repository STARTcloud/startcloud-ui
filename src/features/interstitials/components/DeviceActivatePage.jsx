import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import AuthShell from '../../../components/common/AuthShell';
import DeviceCodeTimer, { useDeviceCode } from '../../../components/common/DeviceCodeTimer';
import Field from '../../../components/common/Field';
import NativeForm from '../../../components/common/NativeForm';
import ProblemAlert from '../../../components/common/ProblemAlert';
import { AccountRows, accountShape } from '../../../components/layout/AccountSwitcherModal';
import { useStatus } from '../../../contexts/StatusContext';
import { useProblemReporter } from '../../../hooks/useProblemReporter';
import { sessionStateShape } from '../../../hooks/useSession';
import { currentPath } from '../../../lib/returnTo';
import { returnToShape } from '../../../utils/auth';
import { hasFeature } from '../../../utils/capabilities';
import { deviceCode } from '../api/interstitials';

const CODE = /[^A-Z0-9-]/g;

/**
 * The chooser step the device page draws first while the browser holds
 * more than one account, because a device code is approved by the active
 * person: the active row picked answers `onPicked` and the code step
 * follows with no request; another row posts the choice through the
 * session, a top-level navigation to the answered `next`, or back to this
 * page with its code when `next` is `/`.
 */
const AccountStep = ({ accounts, session, onPicked }) => {
  const { t } = useTranslation(['auth']);
  const report = useProblemReporter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  const pick = entry => {
    if (entry.active) {
      onPicked();
      return;
    }
    setBusy(true);
    setProblem(null);
    session.chooseAccount(entry, currentPath()).catch(error => {
      setBusy(false);
      setProblem(report(error));
    });
  };

  return (
    <AuthShell title={t('accounts.title')} subtitle={t('accounts.deviceSubhead')}>
      {problem ? <ProblemAlert problem={problem} /> : null}
      <AccountRows accounts={accounts} busy={busy} onPick={pick} />
    </AuthShell>
  );
};

AccountStep.propTypes = {
  accounts: PropTypes.arrayOf(accountShape).isRequired,
  session: PropTypes.object.isRequired,
  onPicked: PropTypes.func.isRequired,
};

/**
 * The browser's accounts read once for the device page while the status
 * lists `switch` under `accounts` and the session is adopted; null until
 * the answer, the empty list on a failed read, and the empty list at once
 * while the status does not list the flag.
 *
 * @param {Object} options - The page's side
 * @param {Object} options.session - The cookie session provider
 * @param {boolean} options.signedIn - Whether `load()` confirmed a user
 * @param {boolean} options.switchable - Whether the status lists `switch` under `accounts`
 * @returns {Array<Object>|null} The accounts, or null while unread
 */
const useAccounts = ({ session, signedIn, switchable }) => {
  const [accounts, setAccounts] = useState(switchable ? null : []);

  useEffect(() => {
    if (!signedIn || !switchable) {
      return undefined;
    }
    let active = true;
    session
      .accounts()
      .then(answer => {
        if (active) {
          setAccounts(answer?.accounts || []);
        }
      })
      .catch(() => {
        if (active) {
          setAccounts([]);
        }
      });
    return () => {
      active = false;
    };
  }, [session, signedIn, switchable]);

  return accounts;
};

/**
 * `/activate`: the chooser step first while the browser holds more than
 * one account and the status lists `switch` under `accounts`, then the
 * device code field, uppercase and prefilled from
 * `?user_code`, the `?error=invalid_user_code` alert painted on the field,
 * the client's name and the time the code has left from
 * `GET /api/auth/device`, read on load for a prefilled code and when the
 * field loses focus for a typed one, and Continue as a real form post to
 * `/oauth2/device_verification`, disabled once the code has expired; a
 * visitor without a session is sent to sign in with this page, query and
 * all, as the return path, so the code is still prefilled when they land
 * back here.
 *
 * @param {Object} props - The router's side
 * @param {Object} props.account - The session state from `useSession`
 * @param {Object} props.returnTo - The helper from `createReturnTo`
 * @param {Object} props.session - The cookie session provider
 */
const DeviceActivatePage = ({ account, returnTo, session }) => {
  const { t } = useTranslation(['auth']);
  const navigate = useNavigate();
  const location = useLocation();
  const status = useStatus();
  const { pathname, search } = location;
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [code, setCode] = useState(() => (params.get('user_code') || '').toUpperCase());
  const [asked, setAsked] = useState(code);
  const [picked, setPicked] = useState(false);
  const mismatch = params.get('error') === 'invalid_user_code';
  const { loaded, user } = account;
  const signedIn = loaded && Boolean(user);
  const accounts = useAccounts({
    session,
    signedIn,
    switchable: hasFeature(status, 'accounts', 'switch'),
  });
  const device = useDeviceCode(deviceCode, signedIn ? asked : '');

  useEffect(() => {
    document.title = t('device.title');
  }, [t]);

  useEffect(() => {
    if (loaded && !user) {
      navigate(returnTo.signInTo(`${pathname}${search}`));
    }
  }, [loaded, navigate, pathname, returnTo, search, user]);

  if (!signedIn || !accounts) {
    return null;
  }

  if (accounts.length > 1 && !picked) {
    return <AccountStep accounts={accounts} session={session} onPicked={() => setPicked(true)} />;
  }

  const change = event => {
    const typed = event.target.value.toUpperCase().replace(CODE, '');
    setCode(typed);
    setAsked(held => (held === typed ? held : ''));
  };

  return (
    <AuthShell title={t('device.title')} subtitle={t('device.subhead')}>
      <DeviceCodeTimer device={device} />
      <NativeForm action="/oauth2/device_verification">
        <Field
          id="device-code"
          label={t('device.code')}
          error={mismatch ? t('device.mismatch') : ''}
          className="auth-field"
        >
          {aria => (
            <div className="auth-input-wrap">
              <input
                {...aria}
                name="user_code"
                type="text"
                className="device-code"
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="XXXX-XXXX"
                value={code}
                onChange={change}
                onBlur={() => setAsked(code)}
              />
            </div>
          )}
        </Field>
        <button
          type="submit"
          className="auth-btn auth-btn-primary auth-btn-block"
          disabled={device.expired}
        >
          {t('device.continue')}
        </button>
      </NativeForm>
    </AuthShell>
  );
};

DeviceActivatePage.propTypes = {
  account: sessionStateShape.isRequired,
  returnTo: returnToShape.isRequired,
  session: PropTypes.object.isRequired,
};

export default DeviceActivatePage;
