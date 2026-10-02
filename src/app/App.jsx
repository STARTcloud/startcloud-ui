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
import {
  RebuildItem,
  resetCatalogCache,
  setMemberships,
} from '../features/collections/provisioners';
import { collectionsFor } from '../features/collections/registry';
import { ServersProvider, apiReference, filtersByOrganization } from '../features/hosts';
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
  footerPaneFor,
  routeCrumbParent,
  routeTitleKey,
  sidebarEntries,
} from './router';

const persistMode = mode => session.savePreferences({ mode });

const persistTheme = theme => session.savePreferences({ theme: theme || null });

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
 * download login, which keeps nothing of its own and so has no inbox; on
 * an `apikey` host the token alone is the scope, because the agent lists
 * it only while it holds a live token for its bound account and relays
 * the inbox under that token.
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
 * The API reference rows of the user menu's app section: the rows the
 * hosts feature answers on the `hyperweaver-server` role, Server API and
 * on a host's route Agent API, else the one row of `links.api`, none
 * while the host answers no `links.api`.
 */
const apiRowsFor = (status, pathname) => apiReference(status, pathname) || ownApiRows(status);

/**
 * The shell's flags from the status and the session. On a host that
 * narrows by organization, `orgFilter`, the switcher draws the session's
 * own memberships under All organizations and reads no list when it
 * opens, because the profile of such a host answers every member the
 * switcher draws and the host has no route that lists them again; on
 * every other `backend` host the switcher reads the memberships as it
 * opens. The Organization console row draws for a manager of the active
 * organization, the membership found by its uuid and judged by its
 * name.
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
 * The app behind the status: the session from the host's first `auth`
 * token, the mode, the theme over the themes the host offers, painted by
 * the shared theme store and chosen on the profile's Preferences page
 * alone, the motion switch written through to the account as the mode
 * is and read by the Preferences tab from its own store, and the
 * favicon, the setup gate while the host advertises
 * `setup`, the identity avatar (Gravatar for a backend session, the
 * profile's picture for a cookie one, the provider's picture for an
 * identity-provider one), the event stream a session keeps, its
 * terminate and profile events, the favorites read while the host lists
 * `favorites`, never asked of a host that lists no such route, the read
 * the session deferred while it was adopted on an auth path run the
 * first time the route leaves those paths, the ticket link, the
 * notification adapters (the inbox one handed to the shell's bell and to
 * the inbox route alike, its unread count in the notifications feature's
 * one context around them both, neither drawn for a guest-only
 * account), the hosts feature's one list of servers in its context
 * around the shell, dropped and asked for again when a person signs in
 * or out, handed the active organization on a host that narrows by
 * organization (`filtersByOrganization`, the `hyperweaver-server` role
 * that lists `hosts`), where the session takes All organizations as a
 * choice and the hosts and machines every surface draws are the ones
 * under the choice, the sidebar entries the mounted
 * features export, the action menu the first mounted feature exports for
 * the header's account slot while one does, the views hook the first
 * mounted feature exports for the footer's pane while one does, the
 * crumb context a page names its own crumb through, and the shell around
 * the routes. A sign-out from the user menu forgets the session and moves
 * home in one transition, so the page signed out of never draws itself
 * for a visitor and sends nobody to the sign-in page on the way home.
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
    onPersistTheme: persistTheme,
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
  const actionMenu = actionMenuFor({ status, account: { user } });
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
        <NavbarSearchProvider appSearch={appSearch}>
          <CrumbProvider>
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
        </NavbarSearchProvider>
      </ServersProvider>
    </UnreadProvider>
  );
};

App.propTypes = {
  getSupportedLanguages: PropTypes.func.isRequired,
};

export default App;
