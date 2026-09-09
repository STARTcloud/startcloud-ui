import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import BrandLogo from '../components/common/BrandLogo';
import AppShell from '../components/layout/AppShell';
import { brandLogoUrl } from '../config/brand';
import { ACTIVE_ORG_KEY, PREFS_PREFIX } from '../config/constants';
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
import { useSession } from '../hooks/useSession';
import { useSessionKeepalive } from '../hooks/useSessionKeepalive';
import { useSetupGate } from '../hooks/useSetupGate';
import { useTheme } from '../hooks/useTheme';
import { useTicketUrl } from '../hooks/useTicketUrl';
import { loadOrganizations } from '../lib/organizations';
import { client, events, fetchHealth, hubClient, returnTo, session } from '../lib/runtime';
import { authMethod, hasFeature } from '../utils/capabilities';
import { formatFileSize } from '../utils/formatFileSize';
import { isManager } from '../utils/membership';

import AppRoutes, { sidebarEntries } from './router';

const isGlobalAdmin = user =>
  Boolean(user?.roles?.includes('ROLE_ADMIN') || user?.authorities?.includes('ROLE_ADMIN'));

const persistTheme = preference => session.savePreferences({ theme: preference });

const adoptMemberships = next => setMemberships(next?.organizations || []);

const createRuntimeAdapters = status => ({
  notifications: createNotificationsAdapter({ status, client, hubClient }),
  ...createPushAdapter({ status, client }),
});

const notificationsFor = ({ status, cookie, claims, user, notifications }) => {
  const scoped = cookie || hasNotificationsScope(claims) || hasNotificationsScope(user);
  return hasFeature(status, 'notifications') && scoped ? notifications : null;
};

const shellFlags = ({ status, backend, cookie, globalAdmin, memberships, activeOrgUuid }) => ({
  loadOrganizations: backend ? loadOrganizations : null,
  showAbout: hasAbout(status),
  showAdminBoard: hasFeature(status, 'admin') && globalAdmin && !cookie,
  showOrgConsole:
    hasFeature(status, 'org-console') && isManager(memberships, activeOrgUuid, globalAdmin),
  appRows: hasFeature(status, 'rebuild') && globalAdmin ? <RebuildItem /> : null,
  fetchHealth: hasFeature(status, 'health') ? fetchHealth : null,
});

/**
 * The app behind the status: the session from the host's first `auth`
 * token, the theme and favicon, the setup gate while the host advertises
 * `setup`, the identity avatar (Gravatar for a backend session, the
 * profile's picture for a cookie one, the provider's picture for an
 * identity-provider one), the profile reload and
 * the terminate stream a backend session keeps, the ticket link, the
 * notification adapters (the inbox one handed to the shell's bell and to
 * the inbox route alike, its unread count in the notifications feature's
 * one context around them both), the sidebar entries the mounted
 * features export, and the shell around the routes.
 */
const App = ({ getSupportedLanguages }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const { user, claims, organizations: memberships, activeOrgUuid, loaded, reload } = account;
  const {
    theme,
    preference: themePreference,
    setPreference: setThemePreference,
    toggleTheme,
  } = useTheme({ siteTheme: status.brand.theme || '', onPersist: persistTheme });
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
  const appSearch = useAppSearch(collections);

  useFavicon(theme, {
    light: brandLogoUrl(status.brand, 'light'),
    dark: brandLogoUrl(status.brand, 'dark'),
  });
  useAccountPreferences({ user, setThemePreference });
  useSessionKeepalive({ enabled: backend, user, loaded, reload });
  const sidebar = useMemo(() => sidebarEntries({ status, account: { user } }), [status, user]);

  if (setupComplete === null) {
    return <div>{t('loading')}</div>;
  }

  const globalAdmin = isGlobalAdmin(user);
  const flags = shellFlags({ status, backend, cookie, globalAdmin, memberships, activeOrgUuid });
  const inbox = notificationsFor({ status, cookie, claims, user, notifications });

  const handleSignOut = () => {
    account.signOut();
    resetCatalogCache();
    navigate('/');
  };

  const afterSignIn = () => navigate(returnTo.consume() || '/', { replace: true });

  const context = {
    user,
    orgMark: <BrandLogo theme={theme} className="logo-xl icon-with-margin-sm" />,
    prefsPrefix: PREFS_PREFIX,
    appName: status.brand.name,
    formatFileSize,
  };

  return (
    <UnreadProvider>
      <NavbarSearchProvider appSearch={appSearch}>
        <AppShell
          account={account}
          avatarUrl={avatarUrl}
          theme={theme}
          themePreference={themePreference}
          toggleTheme={toggleTheme}
          onSignOut={handleSignOut}
          getSupportedLanguages={getSupportedLanguages}
          collections={collections}
          organizations={organizations}
          ticketUrl={ticket}
          notifications={inbox}
          push={pushAdapter}
          sidebar={sidebar}
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
      </NavbarSearchProvider>
    </UnreadProvider>
  );
};

App.propTypes = {
  getSupportedLanguages: PropTypes.func.isRequired,
};

export default App;
