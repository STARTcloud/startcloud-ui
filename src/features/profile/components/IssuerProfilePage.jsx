import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import Avatar from '../../../components/common/Avatar';
import { useStepUp } from '../../../components/common/StepUpDialog';
import { useNotify } from '../../../contexts/NoticeContext';
import { log } from '../../../lib/logger';
import { returnToShape } from '../../../utils/auth';

import FavoritesTab from './FavoritesTab';
import IssuerDetailsTab from './IssuerDetailsTab';
import PreferencesTab from './PreferencesTab';
import SecurityTab from './security/SecurityTab';
import SessionsTab from './SessionsTab';

const PROFILE_PATH = '/user/profile';

/**
 * The identity provider's `account` adapter: the profile read, the
 * step-up call, and one member per group of calls the profile page draws
 * a section for.
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
  linked: PropTypes.object,
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

const sectionsFor = account => {
  const sections = ['profile'];
  if (hasSecurity(account)) {
    sections.push('security');
  }
  if (account.preferences) {
    sections.push('preferences');
  }
  if (account.favorites) {
    sections.push('favorites');
  }
  if (account.sessions) {
    sections.push('sessions');
  }
  return sections;
};

const pathOf = section => (section === 'profile' ? PROFILE_PATH : `${PROFILE_PATH}/${section}`);

const ActiveSection = ({ active, account, profile, version, session, guard, placesKey, page }) => {
  if (active === 'security') {
    return (
      <SecurityTab
        account={account}
        profile={profile}
        guard={guard}
        focusEmail={page.focusEmail}
        onSaved={page.refresh}
        onDeleted={page.signedOut}
      />
    );
  }
  if (active === 'preferences') {
    return (
      <PreferencesTab
        key={version}
        account={account}
        profile={profile}
        session={session}
        onSaved={page.refresh}
      />
    );
  }
  if (active === 'favorites') {
    return <FavoritesTab account={account} />;
  }
  if (active === 'sessions') {
    return <SessionsTab account={account} guard={guard} onSignedOut={page.signedOut} />;
  }
  return (
    <IssuerDetailsTab
      key={version}
      account={account}
      profile={profile}
      guard={guard}
      placesKey={placesKey}
      onSaved={page.refresh}
      onChangeEmail={page.openEmailChange}
    />
  );
};

ActiveSection.propTypes = {
  active: PropTypes.string.isRequired,
  account: PropTypes.object.isRequired,
  profile: PropTypes.object.isRequired,
  version: PropTypes.number.isRequired,
  session: PropTypes.object.isRequired,
  guard: PropTypes.func.isRequired,
  placesKey: PropTypes.string.isRequired,
  page: PropTypes.shape({
    focusEmail: PropTypes.bool.isRequired,
    refresh: PropTypes.func.isRequired,
    signedOut: PropTypes.func.isRequired,
    openEmailChange: PropTypes.func.isRequired,
  }).isRequired,
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
 * cached display fields, then the one section the route names under it,
 * Profile at `/user/profile`, Security at `/user/profile/security`,
 * Preferences at `/user/profile/preferences`, Favorites at
 * `/user/profile/favorites` and Sessions at `/user/profile/sessions`, the
 * sidebar's child rows being the one navigation and no tab strip drawn
 * (decision 109), a section drawn only while the `account` adapter
 * carries its calls and an unknown section drawing Profile; a `#section`
 * hash the estate still links is replaced by the section's route; the
 * full record is read once from `GET /api/user` and re-read after every
 * change the session must reflect, every stepped-up call passing through
 * the one step-up dialog; `user` and `loaded` are the session state's,
 * the page drawing nothing until `loaded` and sending a visitor to sign
 * in only once `loaded` says there is no session, because the cached
 * account is a paint hint.
 */
const IssuerProfilePage = ({ session, events, returnTo, account, user, loaded }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const navigate = useNavigate();
  const location = useLocation();
  const { section = '' } = useParams();
  const sections = useMemo(() => sectionsFor(account), [account]);
  const [record, setRecord] = useState({ profile: null, version: 0 });
  const placesKey = usePlacesKey(account.places || null);
  const { guard, dialog } = useStepUp({
    stepUp: account.stepUp,
    hasPassword: Boolean(record.profile?.has_local_auth),
  });
  const signedIn = loaded && Boolean(user);
  const { profile, version } = record;
  const active = sections.includes(section) ? section : 'profile';
  const focusEmail = Boolean(location.state?.focusEmail);
  const hashSection = location.hash.replace(/^#/, '');

  useEffect(() => {
    document.title = t('profile.pageTitle');
  }, [t]);

  useEffect(() => {
    if (loaded && !user) {
      navigate(returnTo.signInTo(PROFILE_PATH));
    }
  }, [loaded, navigate, returnTo, user]);

  useEffect(() => {
    if (hashSection && sections.includes(hashSection)) {
      navigate(pathOf(hashSection), { replace: true });
    }
  }, [hashSection, navigate, sections]);

  const loadProfile = useCallback(
    () =>
      account
        .profile()
        .then(next => setRecord(previous => ({ profile: next, version: previous.version + 1 })))
        .catch(error => {
          log.api.error('Error loading profile', { error: error.message });
          notify('danger', t(error.messageKey || 'errors.request'));
        }),
    [account, notify, t]
  );

  useEffect(() => {
    if (signedIn) {
      loadProfile();
    }
  }, [loadProfile, signedIn]);

  const refresh = useCallback(async () => {
    await loadProfile();
    const next = await session.reload();
    if (next) {
      events.emit('login');
    }
  }, [events, loadProfile, session]);

  const openEmailChange = () => {
    navigate(pathOf('security'), { state: { focusEmail: true } });
  };

  const signedOut = next => {
    session.endSession();
    navigate(next, { replace: true });
  };

  if (!signedIn) {
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
          <div className="tab-content">
            {profile === null ? (
              <p>{t('loading')}</p>
            ) : (
              <ActiveSection
                active={active}
                account={account}
                profile={profile}
                version={version}
                session={session}
                guard={guard}
                placesKey={placesKey}
                page={{ focusEmail, refresh, signedOut, openEmailChange }}
              />
            )}
          </div>
        </div>
      </div>
      {dialog}
    </div>
  );
};

IssuerProfilePage.propTypes = {
  session: PropTypes.shape({
    reload: PropTypes.func.isRequired,
    endSession: PropTypes.func.isRequired,
    savePreferences: PropTypes.func.isRequired,
  }).isRequired,
  events: PropTypes.shape({ emit: PropTypes.func.isRequired }).isRequired,
  returnTo: returnToShape.isRequired,
  account: issuerAccountShape.isRequired,
  user: PropTypes.object,
  loaded: PropTypes.bool.isRequired,
};

export default IssuerProfilePage;
