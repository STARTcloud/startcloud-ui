import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import Avatar from '../../../components/common/Avatar';
import { useStepUp } from '../../../components/common/StepUpDialog';
import { useNotify } from '../../../contexts/NoticeContext';
import { isPendingGate } from '../../../lib/gates';
import { log } from '../../../lib/logger';
import { returnToShape } from '../../../utils/auth';
import { userDisplayName, userSecondaryLine } from '../../../utils/identity';

import FavoritesTab from './FavoritesTab';
import IssuerDetailsTab from './IssuerDetailsTab';
import OrganizationsTab from './OrganizationsTab';
import PreferencesTab from './PreferencesTab';
import SecurityTab from './security/SecurityTab';
import ServiceAccountsTab from './ServiceAccountsTab';
import SessionsTab from './SessionsTab';

/**
 * The `account` adapter of the profile page, one shape for every host:
 * `profile` reads the current record; `stepUp` arms the step-up window
 * where the host has one; every other member is one group of calls the
 * page draws a section for and draws nothing without, the identity
 * provider carrying `details`, `address`, `phone`, `email`, `password`,
 * `tfa`, `passkeys`, `backupCodes`, `linked`, `sessions`, `favorites`,
 * `preferences` and `deletion`, and a UI backend with accounts of its own
 * carrying `details`, `password`, `email`, `deletion`, `verification`
 * (the emailed verification link's consume and its resend),
 * `organizations` and `serviceAccounts`.
 */
export const accountShape = PropTypes.shape({
  profile: PropTypes.func.isRequired,
  stepUp: PropTypes.func,
  verification: PropTypes.shape({
    verify: PropTypes.func.isRequired,
    resend: PropTypes.func.isRequired,
  }),
  details: PropTypes.func,
  address: PropTypes.func,
  places: PropTypes.func,
  phone: PropTypes.object,
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
  organizations: PropTypes.shape({
    list: PropTypes.func.isRequired,
    leave: PropTypes.func.isRequired,
    setPrimary: PropTypes.func,
    requests: PropTypes.func.isRequired,
    cancelRequest: PropTypes.func.isRequired,
  }),
  serviceAccounts: PropTypes.shape({
    list: PropTypes.func.isRequired,
    organizations: PropTypes.func.isRequired,
    create: PropTypes.func.isRequired,
    remove: PropTypes.func.isRequired,
  }),
});

const SECURITY_MEMBERS = [
  'password',
  'email',
  'tfa',
  'passkeys',
  'backupCodes',
  'linked',
  'deletion',
];

/**
 * The profile sections by their route segment, the sidebar's Account rows
 * and the router reading the one table.
 */
export const PROFILE_ROUTE_SECTIONS = {
  '': 'profile',
  security: 'security',
  preferences: 'preferences',
  favorites: 'favorites',
  sessions: 'sessions',
  organizations: 'organizations',
  'service-accounts': 'serviceAccounts',
};

const SEGMENTS = Object.fromEntries(
  Object.entries(PROFILE_ROUTE_SECTIONS).map(([segment, section]) => [section, segment])
);

/**
 * The sections the profile page draws for an `account` adapter, in the
 * order the sidebar lists them: Profile always, Security while the
 * adapter carries any security call, then Preferences, Favorites,
 * Sessions, Organizations and Service accounts while it carries theirs.
 *
 * @param {Object} account - The `account` adapter
 * @returns {string[]} The section keys
 */
export const sectionsFor = account => {
  const sections = ['profile'];
  if (SECURITY_MEMBERS.some(member => account[member])) {
    sections.push('security');
  }
  ['preferences', 'favorites', 'sessions', 'organizations', 'serviceAccounts'].forEach(section => {
    if (account[section]) {
      sections.push(section);
    }
  });
  return sections;
};

/**
 * The route of one profile section under the host's profile path,
 * `/user/profile` on the identity provider and `/profile` on a UI backend
 * with accounts of its own.
 *
 * @param {string} basePath - The host's profile path
 * @param {string} section - A section key
 * @returns {string} The route
 */
export const sectionPath = (basePath, section) =>
  section === 'profile' ? basePath : `${basePath}/${SEGMENTS[section]}`;

const plainGuard = call => call();

const noStepUp = () => Promise.reject(new Error('step-up is not offered on this host'));

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
  if (active === 'organizations') {
    return <OrganizationsTab account={account} onSaved={page.refresh} />;
  }
  if (active === 'serviceAccounts') {
    return (
      <ServiceAccountsTab account={account} activeOrgUuid={page.activeOrgUuid} admin={page.admin} />
    );
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
    activeOrgUuid: PropTypes.string.isRequired,
    admin: PropTypes.bool.isRequired,
    refresh: PropTypes.func.isRequired,
    signedOut: PropTypes.func.isRequired,
    openEmailChange: PropTypes.func.isRequired,
  }).isRequired,
};

const VerificationNotice = ({ verification, onResent }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const resend = async () => {
    try {
      const data = await verification.resend();
      notify('success', data?.message || '');
      await onResent();
    } catch (error) {
      notify('danger', t(error.messageKey || 'errors.request'));
    }
  };
  return (
    <div className="alert alert-warning" role="alert">
      {t('profile.messages.emailNotVerified')}
      <button type="button" className="btn btn-link" onClick={resend}>
        {t('profile.buttons.resendVerification')}
      </button>
    </div>
  );
};

VerificationNotice.propTypes = {
  verification: PropTypes.shape({ resend: PropTypes.func.isRequired }).isRequired,
  onResent: PropTypes.func.isRequired,
};

const useVerificationLink = ({ verification, basePath, refresh }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const navigate = useNavigate();
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token') || '';
  const verify = verification?.verify || null;

  useEffect(() => {
    if (!token || !verify) {
      return;
    }
    verify(token)
      .then(data => {
        notify('success', data?.message || '');
        return refresh();
      })
      .catch(error => {
        notify('danger', t(error.messageKey || 'errors.request'));
      })
      .finally(() => {
        navigate(basePath, { replace: true });
      });
  }, [basePath, navigate, notify, refresh, t, token, verify]);
};

const AvatarCard = ({ user }) => (
  <div className="card mb-3">
    <div className="card-body text-center">
      <Avatar picture={user.picture || user.avatarUrl || ''} size={100} />
      <h3 className="mt-3">{userDisplayName(user)}</h3>
      <p className="text-muted mb-0">{userSecondaryLine(user)}</p>
    </div>
  </div>
);

AvatarCard.propTypes = {
  user: PropTypes.object.isRequired,
};

const useProfileRecord = ({ account, session, events, signedIn }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const [record, setRecord] = useState({ profile: null, version: 0 });

  const loadProfile = useCallback(
    () =>
      account
        .profile()
        .then(next => setRecord(previous => ({ profile: next, version: previous.version + 1 })))
        .catch(error => {
          if (isPendingGate(error)) {
            return;
          }
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

  return { ...record, refresh };
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
 * The one profile page of every UI backend with accounts of its own, the
 * identity provider and a `backend` host alike: the avatar card from the
 * session's display fields as the page heading, drawn on the profile
 * route alone (decision 143), then the one section the route names under
 * it on the page's ground, the pages contract's frame, the sidebar's child
 * rows being the one navigation and no tab strip drawn (decision 109); a
 * section is drawn only while the `account` adapter carries its calls
 * (`sectionsFor`), an unknown section drawing Profile, and the route
 * segment maps through `PROFILE_ROUTE_SECTIONS` under `basePath`
 * (`/user/profile` on the issuer, `/profile` on a UI backend); a
 * `#section` hash the estate still links is replaced by the section's
 * route; the record is read once through `account.profile` and re-read,
 * with the session, after every change the session must reflect; while
 * the adapter carries `verification` and the record's `email_verified` is
 * false the unverified notice with its Resend link draws above the
 * section, and a `?token=` in the URL is consumed through
 * `verification.verify`, the outcome notified, the record refreshed and
 * the URL replaced with the bare profile path; every
 * stepped-up call passes through the one step-up dialog while the adapter
 * carries `stepUp`, and runs plainly otherwise; `admin` is the app's
 * global-admin flag and `activeOrgUuid` the switcher's organization, both
 * read by the Service accounts section; `user` and `loaded` are the
 * session state's, the page drawing nothing until `loaded` and sending a
 * visitor to sign in only once `loaded` says there is no session, because
 * the cached account is a paint hint.
 */
const ProfilePage = ({
  session,
  events,
  returnTo,
  account,
  basePath,
  activeOrgUuid,
  admin,
  user = null,
  loaded,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { section = '' } = useParams();
  const sections = useMemo(() => sectionsFor(account), [account]);
  const signedIn = loaded && Boolean(user);
  const { profile, version, refresh } = useProfileRecord({ account, session, events, signedIn });
  const placesKey = usePlacesKey(account.places || null);
  const stepUp = useStepUp({
    stepUp: account.stepUp || noStepUp,
    hasPassword: Boolean(profile?.has_local_auth),
  });
  const guard = account.stepUp ? stepUp.guard : plainGuard;
  const routed = PROFILE_ROUTE_SECTIONS[section] || '';
  const active = sections.includes(routed) ? routed : 'profile';
  const focusEmail = Boolean(location.state?.focusEmail);
  const hashSection = location.hash.replace(/^#/, '');

  useEffect(() => {
    document.title = t('profile.pageTitle');
  }, [t]);

  useEffect(() => {
    if (loaded && !user) {
      navigate(returnTo.signInTo(basePath));
    }
  }, [basePath, loaded, navigate, returnTo, user]);

  useEffect(() => {
    if (hashSection && sections.includes(hashSection)) {
      navigate(sectionPath(basePath, hashSection), { replace: true });
    }
  }, [basePath, hashSection, navigate, sections]);

  useVerificationLink({ verification: account.verification || null, basePath, refresh });

  const openEmailChange = () => {
    navigate(sectionPath(basePath, 'security'), { state: { focusEmail: true } });
  };

  const signedOut = next => {
    session.endSession();
    navigate(next, { replace: true });
  };

  if (!signedIn) {
    return null;
  }

  return (
    <div className="list">
      {active === 'profile' ? <AvatarCard user={user} /> : null}
      {account.verification && profile?.email_verified === false ? (
        <VerificationNotice verification={account.verification} onResent={refresh} />
      ) : null}
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
            page={{
              focusEmail,
              activeOrgUuid,
              admin,
              refresh,
              signedOut,
              openEmailChange,
            }}
          />
        )}
      </div>
      {account.stepUp ? stepUp.dialog : null}
    </div>
  );
};

ProfilePage.propTypes = {
  session: PropTypes.shape({
    reload: PropTypes.func.isRequired,
    endSession: PropTypes.func.isRequired,
    savePreferences: PropTypes.func.isRequired,
  }).isRequired,
  events: PropTypes.shape({ emit: PropTypes.func.isRequired }).isRequired,
  returnTo: returnToShape.isRequired,
  account: accountShape.isRequired,
  basePath: PropTypes.string.isRequired,
  activeOrgUuid: PropTypes.string.isRequired,
  admin: PropTypes.bool.isRequired,
  user: PropTypes.object,
  loaded: PropTypes.bool.isRequired,
};

export default ProfilePage;
