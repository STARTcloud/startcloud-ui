import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import BrandLogo from '../components/common/BrandLogo';
import AppShell from '../components/layout/AppShell';
import { brandLogoUrl } from '../config/brand';
import { ACTIVE_ORG_KEY, PREFS_PREFIX } from '../config/constants';
import { NavbarSearchProvider } from '../contexts/SearchContext';
import { useStatus } from '../contexts/StatusContext';
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
import { loadOrganizations } from '../features/organizations';
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
import { client, events, fetchHealth, hubClient, returnTo, session } from '../lib/runtime';
import { authMethod, hasFeature } from '../utils/capabilities';
import { formatFileSize } from '../utils/formatFileSize';
import { isManager } from '../utils/membership';

import AppRoutes from './router';

const isGlobalAdmin = user =>
  Boolean(user?.roles?.includes('ROLE_ADMIN') || user?.authorities?.includes('ROLE_ADMIN'));

const persistTheme = preference => session.savePreferences({ theme: preference });

const adoptMemberships = next => setMemberships(next?.organizations || []);

const initialThemeOf = backend => (backend ? session.current()?.preferredTheme || '' : '');

const createRuntimeAdapters = status => ({
  notifications: createNotificationsAdapter({ status, client, hubClient }),
  ...createPushAdapter({ status, client }),
});

const notificationsFor = ({ status, claims, user, notifications }) => {
  const scoped = hasNotificationsScope(claims) || hasNotificationsScope(user);
  return hasFeature(status, 'notifications') && scoped ? notifications : null;
};

const shellFlags = ({ status, backend, globalAdmin, memberships, activeOrgUuid }) => ({
  loadOrganizations: backend ? loadOrganizations : null,
  showAdminBoard: hasFeature(status, 'admin') && globalAdmin,
  showOrgConsole:
    hasFeature(status, 'org-console') && isManager(memberships, activeOrgUuid, globalAdmin),
  appRows: hasFeature(status, 'rebuild') && globalAdmin ? <RebuildItem /> : null,
  fetchHealth: hasFeature(status, 'health') ? fetchHealth : null,
});

/**
 * The app behind the status: the session from the host's first `auth`
 * token, the theme and favicon, the setup gate while the host advertises
 * `setup`, the identity avatar (Gravatar for a backend session, the
 * provider's picture for an identity-provider one), the profile reload and
 * the terminate stream a backend session keeps, the ticket link, the
 * notification adapters, and the shell around the routes.
 */
const App = ({ getSupportedLanguages }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const status = useStatus();
  const backend = authMethod(status) === 'backend';
  const [collections] = useState(() => collectionsFor(status));
  const [{ notifications, push, pushAdapter }] = useState(() => createRuntimeAdapters(status));
  const account = useSession({
    provider: session,
    events,
    returnTo,
    activeOrgKey: ACTIVE_ORG_KEY,
    push,
    onAdopt: hasFeature(status, 'private-catalogs') ? adoptMemberships : null,
  });
  const { user, claims, organizations: memberships, activeOrgUuid, reload } = account;
  const {
    theme,
    preference: themePreference,
    setPreference: setThemePreference,
    toggleTheme,
  } = useTheme({ initialPreference: initialThemeOf(backend), onPersist: persistTheme });
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
  const avatarUrl = useAccountAvatar({ backend, user, claims });
  const ticket = useTicketUrl({ status, user, claims, activeOrgCode: orgCode });
  const appSearch = useAppSearch(collections);

  useFavicon(theme, {
    light: brandLogoUrl(status.brand, 'light'),
    dark: brandLogoUrl(status.brand, 'dark'),
  });
  useAccountPreferences({ user, setThemePreference });
  useSessionKeepalive({ enabled: backend, user, reload });

  if (setupComplete === null) {
    return <div>{t('loading')}</div>;
  }

  const globalAdmin = isGlobalAdmin(user);
  const flags = shellFlags({ status, backend, globalAdmin, memberships, activeOrgUuid });

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
        notifications={notificationsFor({ status, claims, user, notifications })}
        push={pushAdapter}
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
        />
      </AppShell>
    </NavbarSearchProvider>
  );
};

App.propTypes = {
  getSupportedLanguages: PropTypes.func.isRequired,
};

export default App;
