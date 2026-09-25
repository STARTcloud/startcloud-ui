import PropTypes from 'prop-types';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBook, FaBuilding, FaCircleInfo, FaEnvelope, FaGear } from 'react-icons/fa6';
import { Link, useLocation } from 'react-router-dom';

import { POWERED_BY } from '../../config/brand';
import { useCrumb } from '../../contexts/CrumbContext';
import { useNotify } from '../../contexts/NoticeContext';
import { useStatus } from '../../contexts/StatusContext';
import { sessionStateShape } from '../../hooks/useSession';
import { useSidebarBadges } from '../../hooks/useSidebarBadges';
import { reportRenderError } from '../../lib/logger';
import { returnTo } from '../../lib/runtime';
import { authMethod, hasFeature } from '../../utils/capabilities';
import { userDisplayName, userSecondaryLine } from '../../utils/identity';
import {
  buildRouteCrumbs,
  parentedCrumbs,
  parseRoute,
  reservedSegments,
  sidebarCrumbs,
  titleCrumb,
} from '../../utils/routes';
import Avatar from '../common/Avatar';
import BrandLogo from '../common/BrandLogo';
import ErrorBoundary from '../common/ErrorBoundary';

import Footer from './Footer';
import Header from './Header';
import { lookShape } from './LookMenu';
import { NoticeCards } from './Notices';
import { notificationsAdapterShape, pushAdapterShape } from './NotificationsModal';
import { OrgLogo, organizationShape } from './OrgSwitcherModal';
import Sidebar, { sidebarGroupShape } from './Sidebar';

const SESSION_ENDED_KEY = 'session-ended';

const DISCOVER_PATH = '/organizations/discover';

const footerRepoUrl = brand => brand.repo || brand.changelog || '';

const LOCAL_PROFILE_PATHS = { backend: '/profile', cookie: '/user/profile' };

const localProfileFor = status => {
  const to = LOCAL_PROFILE_PATHS[authMethod(status)];
  return to ? { to, LinkComponent: Link } : null;
};

const menuLinksFor = ({ status, cookie, issuerUrl }) => {
  if (cookie) {
    return {
      issuerUrl: '',
      viewAllUrl: '',
      viewAllTo: hasFeature(status, 'inbox') ? '/notifications' : '',
      preferencesTo: '/user/profile/preferences',
    };
  }
  return {
    issuerUrl,
    viewAllUrl: issuerUrl ? `${issuerUrl}/notifications` : '',
    viewAllTo: '',
    preferencesTo: '',
  };
};

const buildUserMenu = ({ account, status, cookie, identity, orgs, menu }) => {
  const { user, activeOrgUuid, issuerUrl, oidc } = account;
  if (!user) {
    return null;
  }
  return {
    ...identity,
    oidc,
    ...menuLinksFor({ status, cookie, issuerUrl }),
    LinkComponent: Link,
    localProfile: localProfileFor(status),
    organizations: orgs.organizations,
    activeOrgUuid,
    onPickOrg: account.pickOrg,
    loadOrganizations: orgs.load,
    orgMark: orgs.mark,
    favorites: account.favorites,
    appName: status.brand.name,
    appVersion: hasFeature(status, 'footer') ? '' : status.version,
    onSignOutEverywhere: account.signOutEverywhere,
    ...menu,
  };
};

const logoResolver = primary => name =>
  primary ? primary.adapter.getOrganization(name).then(org => org.logo || '') : Promise.resolve('');

const useRouteOrgLogo = (routeOrg, signedIn, logoFor) => {
  const [resolved, setResolved] = useState({ name: '', logo: '' });
  const logoForRef = useRef(logoFor);

  useEffect(() => {
    logoForRef.current = logoFor;
  });

  useEffect(() => {
    if (!routeOrg || !signedIn || !logoForRef.current) {
      return undefined;
    }
    let mounted = true;
    Promise.resolve(logoForRef.current(routeOrg))
      .then(logo => {
        if (mounted) {
          setResolved({ name: routeOrg, logo: logo || '' });
        }
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, [routeOrg, signedIn]);

  return resolved.name === routeOrg ? resolved.logo : '';
};

const shellCrumbs = ({ showSidebar, sidebarMatch, routeCrumbs, reservedRoute, titleKey, t }) => {
  if (!showSidebar) {
    return routeCrumbs;
  }
  if (sidebarMatch.length > 0) {
    return sidebarMatch;
  }
  if (routeCrumbs.length > 0) {
    return routeCrumbs;
  }
  return reservedRoute ? titleCrumb(titleKey, t) : [];
};

const pageCrumbsFor = ({ groups, parented, organizations, activeOrgUuid, pageName, t }) => {
  if (!parented) {
    return [];
  }
  const activeOrganization = organizations.find(entry => entry.uuid === activeOrgUuid) || null;
  return parentedCrumbs({
    groups,
    parent: parented.parent,
    name: parented.name({ activeOrganization, pageName, t }),
    t,
  });
};

const sidebarMatchFor = ({
  showSidebar,
  groups,
  pathname,
  routeCrumbParent,
  organizations,
  activeOrgUuid,
  pageName,
  t,
}) => {
  if (!showSidebar) {
    return [];
  }
  const lists = [
    sidebarCrumbs({ groups, pathname, t }),
    pageCrumbsFor({
      groups,
      parented: routeCrumbParent ? routeCrumbParent(pathname) : null,
      organizations,
      activeOrgUuid,
      pageName,
      t,
    }),
  ];
  return lists.find(list => list.length > 0) || [];
};

const useRouteCrumbs = ({ pathname, reserved, collections, signedIn, orgs, hostOrg, t }) => {
  const route = parseRoute(pathname, { reserved, collections });
  const routeOrg = route?.org || '';
  const member = orgs.organizations.find(entry => entry.name === routeOrg) || null;
  const memberLogo = member?.logo || '';
  const fetchedLogo = useRouteOrgLogo(memberLogo ? '' : routeOrg, signedIn, orgs.logoFor);
  const orgIcon = (
    <OrgLogo
      org={{ logo: memberLogo || fetchedLogo, emailHash: member?.emailHash || '' }}
      size={16}
      className="rounded-circle avatar-sm"
      fallback={orgs.crumbMark || null}
    />
  );
  return {
    crumbs: signedIn ? buildRouteCrumbs({ route, t, orgIcon, hostOrg }) : [],
    reserved: !route,
  };
};

const useSessionEndedBanner = (ended, signInTo) => {
  const { t } = useTranslation();
  const notify = useNotify();

  useEffect(() => {
    if (!ended) {
      notify('warning', '', { key: SESSION_ENDED_KEY });
      return;
    }
    const text = (
      <>
        <strong>{t('sessionEnded.title')}</strong> {t('sessionEnded.body')}
      </>
    );
    const action = signInTo ? { label: t('navbar.signIn'), to: signInTo } : null;
    notify('warning', text, { tier: 'banner', key: SESSION_ENDED_KEY, action });
  }, [ended, notify, signInTo, t]);
};

const useSidebarOverlay = pathname => {
  const [openAt, setOpenAt] = useState('');
  return {
    open: openAt === pathname,
    toggle: () => setOpenAt(previous => (previous === pathname ? '' : pathname)),
    close: () => setOpenAt(''),
  };
};

const menuFor = ({ cookie, issuerUrl, onAuthPage, rows, adapters }) => ({
  appRows: cookie && onAuthPage ? null : rows,
  showPreferences: cookie || Boolean(issuerUrl),
  ...adapters,
});

const signInFor = ({ account, anonymous, onAuthPage, pathname, search }) => {
  if (anonymous || onAuthPage) {
    return { onSignIn: null, signInTo: '' };
  }
  const returnPath = account.sessionEnded?.returnTo || `${pathname}${search}`;
  return { onSignIn: account.signIn, signInTo: returnTo.signInTo(returnPath) };
};

const bannerSignInFor = ({ account, onAuthPage }) =>
  onAuthPage ? returnTo.signInTo(account.sessionEnded?.returnTo || '') : '';

const columnGates = ({ cookie, showAbout, showOrgConsole }) => ({
  showAbout,
  showOrgConsole: showOrgConsole && !cookie,
});

const identityFor = ({ user, claims, t }) => {
  const displayName = claims?.name || userDisplayName(user) || t('user.unknownUser');
  return { displayName, email: userSecondaryLine({ ...user, name: displayName }) };
};

const ShellFooter = ({ fetchHealth }) => {
  const status = useStatus();
  if (!hasFeature(status, 'footer')) {
    return null;
  }
  return (
    <Footer
      appName={status.brand.name}
      version={status.version}
      repoUrl={footerRepoUrl(status.brand)}
      poweredBy={POWERED_BY}
      fetchHealth={fetchHealth}
      streamed={hasFeature(status, 'events') && Boolean(status.events)}
    />
  );
};

ShellFooter.propTypes = {
  fetchHealth: PropTypes.func,
};

const appRowsFor = ({ showAbout, showAdminBoard, showOrgConsole, extraRows, links, t }) => {
  const rows = [];
  if (showAdminBoard) {
    rows.push(
      <Dropdown.Item key="admin" as={Link} to="/admin">
        <FaGear className="me-2" />
        {t('navbar.admin')}
      </Dropdown.Item>
    );
  }
  if (showOrgConsole) {
    rows.push(
      <Dropdown.Item key="org-console" as={Link} to="/org-console">
        <FaBuilding className="me-2" />
        {t('navbar.orgConsole')}
      </Dropdown.Item>
    );
  }
  if (extraRows) {
    rows.push(<Fragment key="extra">{extraRows}</Fragment>);
  }
  if (showAbout) {
    rows.push(
      <Dropdown.Item key="about" as={Link} to="/about">
        <FaCircleInfo className="me-2" />
        {t('navbar.about')}
      </Dropdown.Item>
    );
  }
  if (links.contact) {
    rows.push(
      <Dropdown.Item key="contact" href={links.contact} target="_blank" rel="noopener noreferrer">
        <FaEnvelope className="me-2" />
        {t('navbar.contact')}
      </Dropdown.Item>
    );
  }
  if (links.docs) {
    rows.push(
      <Dropdown.Item key="docs" href={links.docs}>
        <FaBook className="me-2" />
        {t('navbar.docs')}
      </Dropdown.Item>
    );
  }
  return rows.length > 0 ? rows : null;
};

/**
 * The whole chrome around the routes, described by the host's status: the
 * sidebar first while the host lists `sidebar` and a mounted feature
 * exported entries for it (the gate on `sidebarEntries`, the shell only
 * reading whether the list is empty), then
 * the header with the brand from `status.brand` (in the sidebar's top
 * while one draws, one link to `/`), the crumbs (while the sidebar draws,
 * from the route alone, never from the tree: `<group> › <row>`
 * on a route a sidebar row matches, `<group> › <row> › <child>` on a
 * route a child row matches, `<group> › <row> › <name>` on a page
 * `routeCrumbParent` names a parent row for, the page's own name last,
 * resolved from what the shell holds (the organization console's the
 * active membership's name) and from the name the page itself sets
 * through `usePageName` into the crumb context, the resolver handed
 * `{ activeOrganization, pageName, params, t }` so a translated
 * placeholder stands in while the page has not loaded, else the route
 * parser's crumbs on a catalog route, else the page's title from
 * `routeTitleKey` on a reserved route, else nothing; without a column
 * the route parser's crumbs alone), the user
 * menu and the notice banners; the notice cards; the one scroll region
 * with the page inside its own error boundary so a page that throws keeps
 * the chrome; and the footer while the host lists the `footer` token. The
 * column and the app section are hidden on the auth routes of the
 * session's return-path helper, and on every host the cluster's Sign in
 * button is hidden there too, the page below carrying the sign-in and the
 * session-ended banner carrying its own Sign in in its place; on a
 * `cookie` host the menu draws no
 * Organization console row, the sidebar's Organizations row being that
 * destination, its app section holding the About row, an in-router link
 * to `/about`, with the docs and contact rows as on every other host, and
 * its Preferences row an in-router link to `/user/profile/preferences`,
 * the one destination drawn in both the column and the menu; while the
 * host advertises `discover` the cluster carries Discover, an in-router
 * link to the discovery page drawn as the compass cluster button; the
 * cluster keeps one order in both states, search, Discover, the ticket
 * icon, theme (a menu of the variant and the look while the host offers
 * packs), language, then the account menu or Sign in, each control
 * drawn only in the state it belongs to: signed out the left of the bar
 * holds the brand alone and the cluster is Discover, the ticket icon
 * (the ticket link the app supplies, built from the fallback customer id
 * alone, in a new tab, drawn only while there is a ticket system), theme,
 * language and Sign in, with no search icon because app-wide search
 * needs a session; signed in, the search icon, its box and the panel
 * under the bar draw only while the host lists `search`, a host without
 * the token drawing none of them. The app supplies
 * the session state, the
 * collections the host mounts, the avatar, the ticket link, the
 * notification adapters, the sidebar entries and the menu rows the host's
 * features unlock.
 */
const AppShell = ({
  account,
  avatarUrl,
  theme,
  themePreference,
  toggleTheme,
  setThemePreference,
  look,
  onSignOut,
  getSupportedLanguages,
  collections,
  organizations,
  loadOrganizations = null,
  ticketUrl,
  notifications = null,
  push,
  showAbout,
  showAdminBoard,
  showOrgConsole,
  appRows = null,
  fetchHealth = null,
  sidebar = [],
  routeTitleKey = null,
  routeCrumbParent = null,
  children,
}) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const { pathname, search } = useLocation();
  const { name: pageName } = useCrumb();
  const scrollRef = useRef(null);
  const { user, claims, activeOrgUuid } = account;
  const signedIn = Boolean(user);
  const anonymous = authMethod(status) === 'none';
  const cookie = authMethod(status) === 'cookie';
  const reserved = reservedSegments(collections);
  const [primary] = collections;
  const orgs = {
    organizations,
    activeUuid: activeOrgUuid,
    onPick: account.pickOrg,
    load: loadOrganizations,
    mark: <BrandLogo className="logo-md icon-with-margin" />,
    crumbMark: <BrandLogo className="logo-sm" />,
    logoFor: logoResolver(primary),
  };
  const onAuthPage = returnTo.onAuthPage(pathname);
  const showSidebar = sidebar.length > 0 && !onAuthPage;
  const overlay = useSidebarOverlay(pathname);
  const badges = useSidebarBadges({ status, entries: showSidebar ? sidebar : [], notifications });
  const route = useRouteCrumbs({
    pathname,
    reserved,
    collections,
    signedIn,
    orgs,
    hostOrg: status.organization || '',
    t,
  });
  const crumbs = shellCrumbs({
    showSidebar,
    sidebarMatch: sidebarMatchFor({
      showSidebar,
      groups: sidebar,
      pathname,
      routeCrumbParent,
      organizations,
      activeOrgUuid,
      pageName,
      t,
    }),
    routeCrumbs: route.crumbs,
    reservedRoute: route.reserved,
    titleKey: routeTitleKey ? routeTitleKey(pathname) : '',
    t,
  });
  useSessionEndedBanner(
    Boolean(account.sessionEnded) && !signedIn && !anonymous,
    bannerSignInFor({ account, onAuthPage })
  );

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [pathname]);

  const changeLanguage = async lng => {
    account.savePreferences({ language: lng });
    await i18n.changeLanguage(lng);
  };

  const renderAvatar = size => (
    <Avatar
      picture={avatarUrl}
      size={size}
      fallback={<BrandLogo className="logo-xl flex-shrink-0" />}
    />
  );

  const signIn = signInFor({ account, anonymous, onAuthPage, pathname, search });

  const gates = columnGates({ cookie, showAbout, showOrgConsole });
  const discoverTo = hasFeature(status, 'discover') ? DISCOVER_PATH : '';

  const userMenu = buildUserMenu({
    account,
    status,
    cookie,
    identity: { ...identityFor({ user, claims, t }), renderAvatar },
    orgs,
    menu: menuFor({
      cookie,
      issuerUrl: account.issuerUrl,
      onAuthPage,
      rows: appRowsFor({
        ...gates,
        showAdminBoard,
        extraRows: appRows,
        links: status.links,
        t,
      }),
      adapters: { notifications, push, ticketUrl, onSignOut },
    }),
  });

  const brand = {
    name: status.brand.name,
    logo: <BrandLogo className="logo-cluster icon-with-margin-sm" />,
    to: '/',
  };

  const stack = (
    <>
      <Header
        brand={showSidebar ? null : brand}
        crumbs={crumbs}
        LinkComponent={Link}
        theme={{
          preference: themePreference,
          resolved: theme,
          onToggle: toggleTheme,
          onPick: setThemePreference,
          look,
        }}
        language={{ languages: getSupportedLanguages(), onPick: changeLanguage }}
        signedIn={signedIn}
        onSignIn={signIn.onSignIn}
        signInTo={signIn.signInTo}
        userMenu={userMenu}
        onSidebarToggle={showSidebar ? overlay.toggle : null}
        discoverTo={discoverTo}
        ticketUrl={ticketUrl}
      />
      <NoticeCards LinkComponent={Link} />
      <div ref={scrollRef} className="container-fluid app-scroll py-3">
        <ErrorBoundary showErrorDetails={import.meta.env.DEV} onError={reportRenderError}>
          {children}
        </ErrorBoundary>
      </div>
      <ShellFooter fetchHealth={fetchHealth} />
    </>
  );

  if (!showSidebar) {
    return <div className="App d-flex flex-column vh-100">{stack}</div>;
  }

  return (
    <div className="App app-with-sidebar d-flex vh-100">
      <Sidebar
        entries={sidebar}
        brand={brand}
        badges={badges}
        open={overlay.open}
        onClose={overlay.close}
      />
      <div className="app-stack d-flex flex-column flex-grow-1 min-width-0">{stack}</div>
    </div>
  );
};

AppShell.propTypes = {
  account: sessionStateShape.isRequired,
  avatarUrl: PropTypes.string.isRequired,
  theme: PropTypes.string.isRequired,
  themePreference: PropTypes.string.isRequired,
  toggleTheme: PropTypes.func.isRequired,
  setThemePreference: PropTypes.func.isRequired,
  look: lookShape.isRequired,
  onSignOut: PropTypes.func.isRequired,
  getSupportedLanguages: PropTypes.func.isRequired,
  collections: PropTypes.array.isRequired,
  organizations: PropTypes.arrayOf(organizationShape).isRequired,
  loadOrganizations: PropTypes.func,
  ticketUrl: PropTypes.string.isRequired,
  notifications: notificationsAdapterShape,
  push: pushAdapterShape.isRequired,
  showAbout: PropTypes.bool.isRequired,
  showAdminBoard: PropTypes.bool.isRequired,
  showOrgConsole: PropTypes.bool.isRequired,
  appRows: PropTypes.node,
  fetchHealth: PropTypes.func,
  sidebar: PropTypes.arrayOf(sidebarGroupShape),
  routeTitleKey: PropTypes.func,
  routeCrumbParent: PropTypes.func,
  children: PropTypes.node.isRequired,
};

export default AppShell;
