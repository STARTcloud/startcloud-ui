import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import BrandLogo from '../components/common/BrandLogo';
import AppShell from '../components/layout/AppShell';
import { brandLogoUrl } from '../config/brand';
import { ACTIVE_ORG_KEY, PREFS_PREFIX } from '../config/constants';
import { CrumbProvider } from '../contexts/CrumbContext';
import { NavbarSearchProvider } from '../contexts/SearchContext';
import { useStatus } from '../contexts/StatusContext';
import { UnreadProvider } from '../contexts/UnreadContext';
import { hasAbout } from '../features/about';
import {
  RebuildItem,
  resetCatalogCache,
  setMemberships,
} from '../features/collections/provisioners';
import { collectionsFor } from '../features/collections/registry';
import {
  createNotificationsAdapter,
  createPushAdapter,
  hasNotificationsScope,
} from '../features/notifications';
import { menuFavorites } from '../features/profile';
import { useAppSearch } from '../features/search';
import { setupApi } from '../features/setup';
import { useAccountAvatar } from '../hooks/useAccountAvatar';
import { useAccountPreferences } from '../hooks/useAccountPreferences';
import { useActiveOrganization } from '../hooks/useActiveOrganization';
import { useFavicon } from '../hooks/useFavicon';
import { useMotion } from '../hooks/useMotion';
import { usePwa } from '../hooks/usePwa';
import { useSession } from '../hooks/useSession';
import { useSessionKeepalive } from '../hooks/useSessionKeepalive';
import { useSetupGate } from '../hooks/useSetupGate';
import { useTheme } from '../hooks/useTheme';
import { useTicketUrl } from '../hooks/useTicketUrl';
import { loadOrganizations } from '../lib/organizations';
import {
  client,
  events,
  fetchHealth,
  hubClient,
  offeredPacks,
  returnTo,
  session,
} from '../lib/runtime';
import { authMethod, hasFeature } from '../utils/capabilities';
import { formatFileSize } from '../utils/formatFileSize';
import { guestOnly, isManager } from '../utils/membership';
import { isGlobalAdmin } from '../utils/permissions';

import AppRoutes, { routeCrumbParent, routeTitleKey, sidebarEntries } from './router';

const persistTheme = preference => session.savePreferences({ theme: preference || null });

const persistPack = pack => session.savePreferences({ pack: pack || null });

const persistMotion = value => session.savePreferences({ motion: value === 'auto' ? null : value });

const adoptMemberships = next => setMemberships(next?.organizations || []);

const createRuntimeAdapters = status => ({
  notifications: createNotificationsAdapter({ status, client, hubClient }),
  ...createPushAdapter({ status, client }),
});

/**
 * The notifications adapter the shell's bell and the inbox route share,
 * null when the host lists no `notifications`, when the session carries
 * no notifications scope, or when the account is guest-only, the shared
 * download login, which keeps nothing of its own and so has no inbox.
 */
const notificationsFor = ({ status, cookie, claims, user, memberships, notifications }) => {
  const scoped = cookie || hasNotificationsScope(claims) || hasNotificationsScope(user);
  if (!hasFeature(status, 'notifications') || !scoped || guestOnly(memberships)) {
    return null;
  }
  return notifications;
};

const shellFlags = ({
  status,
  i18n,
  backend,
  cookie,
  globalAdmin,
  memberships,
  activeOrgUuid,
}) => ({
  loadOrganizations: backend ? loadOrganizations : null,
  showAbout: hasAbout(status, i18n),
  showAdminBoard: hasFeature(status, 'admin') && globalAdmin && !cookie,
  showOrgConsole:
    hasFeature(status, 'org-console') && isManager(memberships, activeOrgUuid, globalAdmin),
  appRows: hasFeature(status, 'rebuild') && globalAdmin ? <RebuildItem /> : null,
  fetchHealth: hasFeature(status, 'health') ? fetchHealth : null,
});

/**
 * The app behind the status: the session from the host's first `auth`
 * token, the theme, the look over the packs the host offers, painted by
 * the shared theme store and chosen on the profile's Preferences page
 * alone, the motion switch written through to the account as the theme
 * is and read by the Preferences tab from its own store, and the
 * favicon, the setup gate while the host advertises
 * `setup`, the identity avatar (Gravatar for a backend session, the
 * profile's picture for a cookie one, the provider's picture for an
 * identity-provider one), the profile reload and
 * the terminate stream a backend session keeps, the favorites read the
 * session deferred while it was adopted on an auth path, run the first
 * time the route leaves those paths, the ticket link, the
 * notification adapters (the inbox one handed to the shell's bell and to
 * the inbox route alike, its unread count in the notifications feature's
 * one context around them both, neither drawn for a guest-only
 * account), the sidebar entries the mounted
 * features export, the crumb context a page names its own crumb through,
 * and the shell around the routes.
 */
const App = ({ getSupportedLanguages }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const status = useStatus();
  const backend = authMethod(status) === 'backend';
  const cookie = authMethod(status) === 'cookie';
  const [collections] = useState(() => collectionsFor(status));
  const [{ notifications, push, pushAdapter }] = useState(() => createRuntimeAdapters(status));
  const account = useSession({
    provider: session,
    events,
    returnTo,
    navigate,
    activeOrgKey: ACTIVE_ORG_KEY,
    push,
    onAdopt: hasFeature(status, 'private-catalogs') ? adoptMemberships : null,
    loadFavorites: menuFavorites,
  });
  const {
    user,
    claims,
    organizations: memberships,
    activeOrgUuid,
    loaded,
    reload,
    oidc,
    issuerUrl,
    readDeferredFavorites,
  } = account;
  const {
    theme,
    preference: themePreference,
    siteVariant,
    setPreference: setThemePreference,
    toggleTheme,
    setPack,
  } = useTheme({
    siteTheme: status.brand.theme || '',
    sitePack: status.brand.pack || null,
    packs: offeredPacks(status.brand),
    onPersist: persistTheme,
    onPersistPack: persistPack,
  });
  const { setMotion } = useMotion({ onPersist: persistMotion });
  const setupComplete = useSetupGate({
    enabled: hasFeature(status, 'setup'),
    checkStatus: setupApi.status,
  });
  const { orgCode, organizations } = useActiveOrganization({
    collections,
    memberships,
    user,
    activeOrgUuid,
  });
  const avatarUrl = useAccountAvatar({ backend, cookie, user, claims });
  const ticket = useTicketUrl({ status, user, claims, activeOrgCode: orgCode });
  const appSearch = useAppSearch(collections, isGlobalAdmin(user));

  useFavicon(brandLogoUrl(status.brand));
  usePwa(status.brand.name);
  useAccountPreferences({
    user,
    setThemePreference,
    setPackPreference: setPack,
    setMotionPreference: setMotion,
  });
  useSessionKeepalive({ enabled: backend, user, loaded, reload });
  useEffect(() => {
    if (!returnTo.onAuthPage(location.pathname)) {
      readDeferredFavorites();
    }
  }, [location.pathname, readDeferredFavorites]);
  const sidebar = useMemo(
    () =>
      sidebarEntries({
        status,
        account: { user, oidc, issuerUrl, organizations: memberships },
        collections,
      }),
    [status, user, oidc, issuerUrl, memberships, collections]
  );

  if (setupComplete === null) {
    return <div>{t('loading')}</div>;
  }

  const globalAdmin = isGlobalAdmin(user);
  const flags = shellFlags({
    status,
    i18n,
    backend,
    cookie,
    globalAdmin,
    memberships,
    activeOrgUuid,
  });
  const inbox = notificationsFor({ status, cookie, claims, user, memberships, notifications });

  const handleSignOut = () => {
    account.signOut();
    resetCatalogCache();
    navigate('/');
  };

  const afterSignIn = () => navigate(returnTo.consume() || '/', { replace: true });

  const context = {
    user,
    signIn: account.signIn,
    orgMark: <BrandLogo className="logo-xl icon-with-margin-sm" />,
    prefsPrefix: PREFS_PREFIX,
    appName: status.brand.name,
    formatFileSize,
  };

  return (
    <UnreadProvider>
      <NavbarSearchProvider appSearch={appSearch}>
        <CrumbProvider>
          <AppShell
            account={account}
            avatarUrl={avatarUrl}
            theme={theme}
            themePreference={themePreference}
            siteVariant={siteVariant}
            toggleTheme={toggleTheme}
            setThemePreference={setThemePreference}
            onSignOut={handleSignOut}
            getSupportedLanguages={getSupportedLanguages}
            collections={collections}
            organizations={organizations}
            ticketUrl={ticket}
            notifications={inbox}
            push={pushAdapter}
            sidebar={sidebar}
            routeTitleKey={routeTitleKey}
            routeCrumbParent={routeCrumbParent}
            {...flags}
          >
            <AppRoutes
              account={account}
              collections={collections}
              context={context}
              theme={theme}
              setupComplete={Boolean(setupComplete)}
              globalAdmin={globalAdmin}
              afterSignIn={afterSignIn}
              notifications={inbox}
              ticketUrl={ticket}
            />
          </AppShell>
        </CrumbProvider>
      </NavbarSearchProvider>
    </UnreadProvider>
  );
};

App.propTypes = {
  getSupportedLanguages: PropTypes.func.isRequired,
};

export default App;
