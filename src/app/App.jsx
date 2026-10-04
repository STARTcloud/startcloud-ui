import PropTypes from 'prop-types';
import { startTransition, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import BrandLogo from '../components/common/BrandLogo';
import AppShell from '../components/layout/AppShell';
import { brandLogoUrl, brandMarkUrl } from '../config/brand';
import { ACTIVE_ORG_KEY, PREFS_PREFIX } from '../config/constants';
import { CrumbProvider } from '../contexts/CrumbContext';
import { NavbarSearchProvider } from '../contexts/SearchContext';
import { useStatus } from '../contexts/StatusContext';
import { UnreadProvider } from '../contexts/UnreadContext';
import { hasAbout } from '../features/about';
import { adminConfig } from '../features/admin';
import {
  RebuildItem,
  resetCatalogCache,
  setMemberships,
} from '../features/collections/provisioners';
import { collectionsFor } from '../features/collections/registry';
import {
  ServersProvider,
  apiReference,
  filtersByOrganization,
  useHostSearchSources,
} from '../features/hosts';
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
  offeredThemes,
  returnTo,
  session,
} from '../lib/runtime';
import { authMethod, hasFeature } from '../utils/capabilities';
import { formatFileSize } from '../utils/formatFileSize';
import { guestOnly, isManager, routeNameOf } from '../utils/membership';
import { isGlobalAdmin } from '../utils/permissions';

import AppRoutes, {
  actionMenuFor,
  controlCommandsFor,
  footerPaneFor,
  routeCrumbParent,
  routeTitleKey,
  searchKindsFor,
  sidebarEntries,
} from './router';

const persistMode = mode => session.savePreferences({ mode });

const SHI_THEME = 'shi';

const persistTheme = theme => session.savePreferences({ theme: theme || null });

/**
 * The theme write-through of the host: the session's preferences write,
 * and on an `apikey` host, hyperweaver-agent's, `ui.shi_mode` written
 * through `PUT /api/config/app` beside it, true on a pick of the `shi`
 * theme and false on any other, so the agent's tray swaps its icon on
 * that save; a refused write is logged by the client and changes nothing
 * in the browser.
 *
 * @param {boolean} apiKey - Whether the host's first `auth` token is `apikey`
 * @returns {Function} Called with the theme's name, empty for the host's own
 */
const persistThemeOf = apiKey =>
  apiKey
    ? theme => {
        adminConfig.update('app', { ui: { shi_mode: theme === SHI_THEME } }).catch(() => null);
        return persistTheme(theme);
      }
    : persistTheme;

const persistMotion = value => session.savePreferences({ motion: value === 'auto' ? null : value });

const adoptMemberships = next => setMemberships(next?.organizations || []);

const createRuntimeAdapters = status => ({
  notifications: createNotificationsAdapter({ status, client, hubClient }),
  ...createPushAdapter({ status, client }),
});

/**
 * The notifications adapter the shell's bell and the inbox route share,
 * null without `notifications`, without a notifications scope, or for a
 * guest-only account.
 */
const notificationsFor = ({ status, cookie, claims, user, memberships, notifications }) => {
  const scoped =
    cookie ||
    authMethod(status) === 'apikey' ||
    hasNotificationsScope(claims) ||
    hasNotificationsScope(user);
  if (!hasFeature(status, 'notifications') || !scoped || guestOnly(memberships)) {
    return null;
  }
  return notifications;
};

const ownApiRows = status =>
  status.links?.api ? [{ key: 'api', labelKey: 'navbar.api', href: status.links.api }] : [];

/**
 * The API reference rows of the user menu's app section: the hosts
 * feature's, else the one row of `links.api`.
 */
const apiRowsFor = (status, pathname) => apiReference(status, pathname) || ownApiRows(status);

/**
 * The shell's flags from the status and the session.
 */
const shellFlags = ({
  status,
  i18n,
  backend,
  cookie,
  globalAdmin,
  memberships,
  activeOrgUuid,
  orgFilter,
  pathname,
}) => ({
  allOrganizations: orgFilter,
  apiRows: apiRowsFor(status, pathname),
  loadOrganizations: backend && !orgFilter ? loadOrganizations : null,
  showAbout: hasAbout(status, i18n),
  showAdminBoard: hasFeature(status, 'admin') && globalAdmin && !cookie,
  showOrgConsole:
    hasFeature(status, 'org-console') &&
    isManager(memberships, routeNameOf(memberships, activeOrgUuid), globalAdmin),
  appRows: hasFeature(status, 'rebuild') && globalAdmin ? <RebuildItem /> : null,
  fetchHealth: hasFeature(status, 'health') ? fetchHealth : null,
});

/**
 * The navbar search's provider inside the hosts feature's context, so the
 * hosts' search sources read the rows it holds.
 */
const SearchProvider = ({ collections, sidebar, kinds, children }) => {
  const status = useStatus();
  const hostSources = useHostSearchSources();
  const appSearch = useAppSearch({ status, collections, sidebar, kinds, hostSources });
  return <NavbarSearchProvider appSearch={appSearch}>{children}</NavbarSearchProvider>;
};

SearchProvider.propTypes = {
  collections: PropTypes.array.isRequired,
  sidebar: PropTypes.array.isRequired,
  kinds: PropTypes.object.isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * The app behind the status: the session, the theme, the providers of the
 * unread count, the hosts feature, the navbar search and the crumbs, the
 * mounted feature's command list, and the shell around the routes.
 */
const App = ({ getSupportedLanguages }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const status = useStatus();
  const backend = authMethod(status) === 'backend';
  const cookie = authMethod(status) === 'cookie';
  const orgFilter = filtersByOrganization(status);
  const [collections] = useState(() => collectionsFor(status));
  const [{ notifications, push, pushAdapter }] = useState(() => createRuntimeAdapters(status));
  const [onPersistTheme] = useState(() => persistThemeOf(authMethod(status) === 'apikey'));
  const account = useSession({
    provider: session,
    events,
    returnTo,
    navigate,
    activeOrgKey: ACTIVE_ORG_KEY,
    allOrganizations: orgFilter,
    push,
    onAdopt: hasFeature(status, 'private-catalogs') ? adoptMemberships : null,
    loadFavorites: hasFeature(status, 'favorites') ? menuFavorites : null,
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
  const { mode, resolved, setMode, toggleMode, theme, themes, setTheme } = useTheme({
    hostTheme: status.brand.theme || null,
    themes: offeredThemes(status.brand),
    onPersistMode: persistMode,
    onPersistTheme,
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

  useFavicon(brandMarkUrl(status.brand, theme, themes), brandLogoUrl(status.brand));
  usePwa(status.brand.name);
  useAccountPreferences({
    user,
    setModePreference: setMode,
    setThemePreference: setTheme,
    setMotionPreference: setMotion,
  });
  useSessionKeepalive({ user, loaded, reload });
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
  const kinds = useMemo(
    () =>
      searchKindsFor({
        status,
        account: { user, oidc, issuerUrl, organizations: memberships },
        collections,
      }),
    [status, user, oidc, issuerUrl, memberships, collections]
  );
  const actionMenu = actionMenuFor({ status, account: { user } });
  const controlCommands = controlCommandsFor({ status, account: { user } });
  const footerPane = footerPaneFor({ status, account: { user } });

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
    orgFilter,
    pathname: location.pathname,
  });
  const inbox = notificationsFor({ status, cookie, claims, user, memberships, notifications });

  const handleSignOut = () => {
    startTransition(() => {
      account.signOut();
      resetCatalogCache();
      navigate('/');
    });
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
      <ServersProvider signedIn={Boolean(user)} organization={orgFilter ? activeOrgUuid : ''}>
        <SearchProvider collections={collections} sidebar={sidebar} kinds={kinds}>
          <CrumbProvider>
            {controlCommands}
            <AppShell
              account={account}
              avatarUrl={avatarUrl}
              mode={mode}
              resolvedMode={resolved}
              toggleMode={toggleMode}
              setMode={setMode}
              onSignOut={handleSignOut}
              getSupportedLanguages={getSupportedLanguages}
              collections={collections}
              organizations={organizations}
              ticketUrl={ticket}
              notifications={inbox}
              push={pushAdapter}
              sidebar={sidebar}
              actionMenu={actionMenu}
              footerPane={footerPane}
              routeTitleKey={routeTitleKey}
              routeCrumbParent={routeCrumbParent}
              {...flags}
            >
              <AppRoutes
                account={account}
                collections={collections}
                context={context}
                mode={resolved}
                setupComplete={Boolean(setupComplete)}
                globalAdmin={globalAdmin}
                afterSignIn={afterSignIn}
                notifications={inbox}
                ticketUrl={ticket}
              />
            </AppShell>
          </CrumbProvider>
        </SearchProvider>
      </ServersProvider>
    </UnreadProvider>
  );
};

App.propTypes = {
  getSupportedLanguages: PropTypes.func.isRequired,
};

export default App;
