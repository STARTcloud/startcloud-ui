import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import Avatar from '../../../components/common/Avatar';
import { useStepUp } from '../../../components/common/StepUpDialog';
import { useNotify } from '../../../contexts/NoticeContext';
import { log } from '../../../lib/logger';
import { returnToShape } from '../../../utils/auth';

import FavoritesTab from './FavoritesTab';
import IssuerDetailsTab from './IssuerDetailsTab';
import PreferencesTab from './PreferencesTab';
import ProfileTabs from './ProfileTabs';
import SecurityTab from './security/SecurityTab';
import SessionsTab from './SessionsTab';

const HASH_TABS = { security: 'security', preferences: 'preferences', sessions: 'sessions' };

/**
 * The identity provider's `account` adapter: the profile read, the
 * step-up call, and one member per group of calls the profile page draws
 * a tab for.
 */
export const issuerAccountShape = PropTypes.shape({
  profile: PropTypes.func.isRequired,
  stepUp: PropTypes.func.isRequired,
  details: PropTypes.func.isRequired,
  address: PropTypes.func.isRequired,
  places: PropTypes.func,
  phone: PropTypes.object.isRequired,
  email: PropTypes.object,
  password: PropTypes.func,
  tfa: PropTypes.object,
  passkeys: PropTypes.object,
  backupCodes: PropTypes.object,
  sessions: PropTypes.object,
  favorites: PropTypes.object,
  preferences: PropTypes.func,
  deletion: PropTypes.func,
});

const hasSecurity = account =>
  Boolean(
    account.password &&
    account.email &&
    account.tfa &&
    account.passkeys &&
    account.backupCodes &&
    account.deletion
  );

const tabsFor = account => {
  const tabs = [{ key: 'profile', labelKey: 'profile.tabs.profile' }];
  if (hasSecurity(account)) {
    tabs.push({ key: 'security', labelKey: 'profile.tabs.security' });
  }
  if (account.preferences) {
    tabs.push({ key: 'preferences', labelKey: 'profile.tabs.preferences' });
  }
  if (account.favorites) {
    tabs.push({ key: 'favorites', labelKey: 'profile.tabs.favorites' });
  }
  if (account.sessions) {
    tabs.push({ key: 'sessions', labelKey: 'profile.tabs.sessions' });
  }
  return tabs;
};

const tabFromHash = (hash, tabs) => {
  const wanted = HASH_TABS[hash.replace(/^#/, '')] || hash.replace(/^#/, '');
  return tabs.some(tab => tab.key === wanted) ? wanted : 'profile';
};

const usePlacesKey = places => {
  const [key, setKey] = useState('');
  useEffect(() => {
    if (!places) {
      return undefined;
    }
    let mounted = true;
    places()
      .then(data => {
        if (mounted && typeof data?.key === 'string') {
          setKey(data.key);
        }
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, [places]);
  return key;
};

/**
 * The profile page in its identity-provider form: the avatar card from the
 * cached display fields, then the tabs the `account` adapter carries the
 * calls for, Profile, Security at `#security`, Preferences at
 * `#preferences`, Favorites and Sessions, the tab read from the URL's
 * hash, the full record read once from `GET /api/user` and re-read after
 * every change the session must reflect, every stepped-up call passing
 * through the one step-up dialog.
 */
const IssuerProfilePage = ({ session, events, returnTo, account }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const navigate = useNavigate();
  const location = useLocation();
  const tabs = useMemo(() => tabsFor(account), [account]);
  const [current] = useState(() => session.restore());
  const [loaded, setLoaded] = useState({ profile: null, version: 0 });
  const [focusEmail, setFocusEmail] = useState(false);
  const placesKey = usePlacesKey(account.places || null);
  const { guard, dialog } = useStepUp({
    stepUp: account.stepUp,
    hasPassword: Boolean(loaded.profile?.has_local_auth),
  });
  const user = current?.user || null;
  const { profile, version } = loaded;
  const activeTab = tabFromHash(location.hash, tabs);

  useEffect(() => {
    document.title = t('profile.pageTitle');
  }, [t]);

  useEffect(() => {
    if (!user) {
      navigate(returnTo.signInTo('/user/profile'));
    }
  }, [navigate, returnTo, user]);

  const loadProfile = useCallback(
    () =>
      account
        .profile()
        .then(next => setLoaded(previous => ({ profile: next, version: previous.version + 1 })))
        .catch(error => {
          log.api.error('Error loading profile', { error: error.message });
          notify('danger', t(error.messageKey || 'errors.request'));
        }),
    [account, notify, t]
  );

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [loadProfile, user]);

  const refresh = useCallback(async () => {
    await loadProfile();
    const next = await session.reload();
    if (next) {
      events.emit('login');
    }
  }, [events, loadProfile, session]);

  const changeTab = tab => {
    setFocusEmail(false);
    navigate({ hash: tab === 'profile' ? '' : `#${tab}` }, { replace: true });
  };

  const openEmailChange = () => {
    changeTab('security');
    setFocusEmail(true);
  };

  const signedOut = next => {
    session.endSession();
    navigate(next, { replace: true });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="list row">
      <div className="card mt-2 mb-2">
        <div className="card-header text-center">
          <Avatar picture={user.picture || ''} size={100} />
          <h3 className="mt-3">{user.name || user.email}</h3>
          <p className="text-muted">{user.email}</p>
        </div>
        <div className="card-body">
          <ProfileTabs tabs={tabs} activeTab={activeTab} onChange={changeTab} />
          <div className="tab-content mt-3">
            {profile === null ? <p>{t('loading')}</p> : null}
            {profile && activeTab === 'profile' ? (
              <IssuerDetailsTab
                key={version}
                account={account}
                profile={profile}
                guard={guard}
                placesKey={placesKey}
                onSaved={refresh}
                onChangeEmail={openEmailChange}
              />
            ) : null}
            {profile && activeTab === 'security' ? (
              <SecurityTab
                account={account}
                profile={profile}
                guard={guard}
                focusEmail={focusEmail}
                onSaved={refresh}
                onDeleted={signedOut}
              />
            ) : null}
            {profile && activeTab === 'preferences' ? (
              <PreferencesTab
                key={version}
                account={account}
                profile={profile}
                session={session}
                onSaved={refresh}
              />
            ) : null}
            {profile && activeTab === 'favorites' ? <FavoritesTab account={account} /> : null}
            {profile && activeTab === 'sessions' ? (
              <SessionsTab account={account} guard={guard} onSignedOut={signedOut} />
            ) : null}
          </div>
        </div>
      </div>
      {dialog}
    </div>
  );
};

IssuerProfilePage.propTypes = {
  session: PropTypes.shape({
    restore: PropTypes.func.isRequired,
    reload: PropTypes.func.isRequired,
    endSession: PropTypes.func.isRequired,
    savePreferences: PropTypes.func.isRequired,
  }).isRequired,
  events: PropTypes.shape({ emit: PropTypes.func.isRequired }).isRequired,
  returnTo: returnToShape.isRequired,
  account: issuerAccountShape.isRequired,
};

export default IssuerProfilePage;
