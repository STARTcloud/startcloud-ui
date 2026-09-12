import PropTypes from 'prop-types';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBook, FaBuilding, FaCircleInfo, FaEnvelope, FaGear } from 'react-icons/fa6';
import { Link, useLocation } from 'react-router-dom';

import { POWERED_BY } from '../../config/brand';
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
  parseRoute,
  rootCrumb,
  sidebarCrumbs,
  titleCrumb,
} from '../../utils/routes';
import Avatar from '../common/Avatar';
import BrandLogo from '../common/BrandLogo';
import ErrorBoundary from '../common/ErrorBoundary';

import Footer from './Footer';
import Header from './Header';
import { NoticeCards } from './Notices';
import { notificationsAdapterShape, pushAdapterShape } from './NotificationsModal';
import { OrgLogo, organizationShape } from './OrgSwitcherModal';
import Sidebar, { sidebarGroupShape } from './Sidebar';

const UNIVERSAL_ROUTES = [
  'about',
  'organizations',
  'login',
  'auth',
  'register',
  'invite',
  'profile',
  'admin',
  'org-console',
  'setup',
  'callback',
  'docs',
  'schema',
  'private',
  'push',
  'search',
  'vm',
  'watches',
  'authenticator',
  'authenticator-method',
  'passwordRecovery',
  'passwordReset',
  'registration',
  'complete-onboarding',
  'qrcode',
  'provider-registration',
  'public',
  'oauth2',
  'activate',
  'activated',
  'ciba',
  'connect',
  'continue',
  'link-account-consent',
  'link-account',
  'user',
  'org',
  'notifications',
  'error',
  'api',
  'assets',
  'brand',
  'locales',
  'fonts',
  'themes',
];

const SESSION_ENDED_KEY = 'session-ended';

const supportLinks = ({ status, ticketUrl, t }) => {
  const links = [];
  if (ticketUrl) {
    links.push({ key: 'help', label: t('navbar.needHelp'), href: ticketUrl, external: true });
  } else if (status.links.docs) {
    links.push({ key: 'help', label: t('navbar.needHelp'), href: status.links.docs });
  }
  if (status.links.contact) {
    links.push({ key: 'contact', label: t('navbar.emailSupport'), href: status.links.contact });
  }
  return links;
};

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

const pathTo = (nodes, kids, current, acc) => {
  for (const node of nodes) {
    const next = [...acc, node];
    if (node.to === current) {
      return next;
    }
    const hit = kids[node.key] ? pathTo(kids[node.key], kids, current, next) : null;
    if (hit) {
      return hit;
    }
  }
  return null;
};

const treeCrumbs = ({ groups, trees, current, t }) => {
  for (const group of groups) {
    const tree = trees[group.key];
    const path = tree ? pathTo(tree.nodes, tree.kids, current, []) : null;
    if (path) {
      return [
        { key: 'group', label: t(group.labelKey) },
        ...path.map(node => ({ key: node.key, label: node.label, to: node.to })),
      ];
    }
  }
  return [];
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

const shellCrumbs = ({
  showSidebar,
  sidebarMatch,
  routeCrumbs,
  reservedRoute,
  name,
  titleKey,
  t,
}) => {
  if (!showSidebar) {
    return routeCrumbs;
  }
  const root = rootCrumb(name);
  if (sidebarMatch.length > 0) {
    return [root, ...sidebarMatch];
  }
  if (routeCrumbs.length > 0) {
    return [root, ...routeCrumbs];
  }
  return reservedRoute ? [root, ...titleCrumb(titleKey, t)] : [root];
};

const useRouteCrumbs = ({ pathname, reserved, collections, signedIn, orgs, t }) => {
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
  return { crumbs: signedIn ? buildRouteCrumbs({ route, t, orgIcon }) : [], reserved: !route };
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

const signInFor = ({ account, anonymous, hidden, onAuthPage, pathname, search }) => {
  if (anonymous || hidden) {
    return { onSignIn: null, signInTo: '' };
  }
  const returnPath = account.sessionEnded?.returnTo || (onAuthPage ? '' : `${pathname}${search}`);
  return { onSignIn: account.signIn, signInTo: returnTo.signInTo(returnPath) };
};

const bannerSignInFor = ({ account, hidden }) =>
  hidden ? returnTo.signInTo(account.sessionEnded?.returnTo || '') : '';

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
 * sidebar first when the mounted features exported entries for it, then
 * the header with the brand from `status.brand` (in the sidebar's top
 * while one draws, one link to `/`), the route crumbs (opened with the root crumb, the
 * product name linking to `/`, while the sidebar draws; `<group> › <row>`
 * on a route a sidebar row matches, `<group> › <row> › <child>` on a
 * route a child row matches, `<group> › <node> › …` down the
 * loaded tree on a route a tree node matches, the way the sidebar mock's
 * `pathTo` walks it, and the page's title from `routeTitleKey` on a
 * reserved route no row matches, so the row is never empty), the user
 * menu and the notice banners; the notice cards; the one scroll region
 * with the page inside its own error boundary so a page that throws keeps
 * the chrome; and the footer while the host lists the `footer` token. The
 * column and the app section are hidden on the auth routes of the
 * session's return-path helper, and on a `cookie` host the cluster's Sign
 * in button is hidden there too, the session-ended banner carrying its
 * own Sign in in its place; on a `cookie` host the menu draws no
 * Organization console row, the sidebar's Organizations row being that
 * destination, its app section holding the About row, an in-router link
 * to `/about`, with the docs and contact rows as on every other host, and
 * its Preferences row an in-router link to `/user/profile/preferences`,
 * the one destination drawn in both the column and the menu; while signed out the
 * left of the bar holds the brand alone and the cluster is Need help?
 * (the ticket link the app supplies, built from the fallback customer id
 * alone, in a new tab, else `links.docs`), Email support (`links.contact`),
 * language, theme and Sign in, with no search icon because app-wide search
 * needs a session. The app supplies
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
  children,
}) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const { pathname, search } = useLocation();
  const scrollRef = useRef(null);
  const { user, claims, activeOrgUuid } = account;
  const signedIn = Boolean(user);
  const anonymous = authMethod(status) === 'none';
  const cookie = authMethod(status) === 'cookie';
  const reserved = [
    ...UNIVERSAL_ROUTES,
    ...collections.map(collection => collection.segment).filter(Boolean),
  ];
  const [primary] = collections;
  const orgs = {
    organizations,
    activeUuid: activeOrgUuid,
    onPick: account.pickOrg,
    load: loadOrganizations,
    mark: <BrandLogo theme={theme} className="logo-md icon-with-margin" />,
    crumbMark: <BrandLogo theme={theme} className="logo-sm" />,
    logoFor: logoResolver(primary),
  };
  const onAuthPage = returnTo.onAuthPage(pathname);
  const signInHidden = cookie && onAuthPage;
  const showSidebar = sidebar.length > 0 && !onAuthPage;
  const overlay = useSidebarOverlay(pathname);
  const [trees, setTrees] = useState({});
  const onTree = useCallback((key, tree) => {
    setTrees(previous => ({ ...previous, [key]: tree }));
  }, []);
  const badges = useSidebarBadges({ status, entries: showSidebar ? sidebar : [], notifications });
  const route = useRouteCrumbs({ pathname, reserved, collections, signedIn, orgs, t });
  const nodeCrumbs = showSidebar
    ? treeCrumbs({ groups: sidebar, trees, current: `${pathname}${search}`, t })
    : [];
  const rowCrumbs = showSidebar ? sidebarCrumbs({ groups: sidebar, pathname, t }) : [];
  const crumbs = shellCrumbs({
    showSidebar,
    sidebarMatch: nodeCrumbs.length > 0 ? nodeCrumbs : rowCrumbs,
    routeCrumbs: route.crumbs,
    reservedRoute: route.reserved,
    name: status.brand.name,
    titleKey: routeTitleKey ? routeTitleKey(pathname) : '',
    t,
  });
  useSessionEndedBanner(
    Boolean(account.sessionEnded) && !signedIn && !anonymous,
    bannerSignInFor({ account, hidden: signInHidden })
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
      fallback={<BrandLogo theme={theme} className="logo-xl flex-shrink-0" />}
    />
  );

  const signIn = signInFor({
    account,
    anonymous,
    hidden: signInHidden,
    onAuthPage,
    pathname,
    search,
  });

  const gates = columnGates({ cookie, showAbout, showOrgConsole });
  const links = signedIn ? [] : supportLinks({ status, ticketUrl, t });

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
    logo: <BrandLogo theme={theme} className="logo-cluster icon-with-margin-sm" />,
    to: '/',
  };

  const stack = (
    <>
      <Header
        brand={showSidebar ? null : brand}
        links={links}
        crumbs={crumbs}
        LinkComponent={Link}
        theme={{ preference: themePreference, resolved: theme, onToggle: toggleTheme }}
        language={{ languages: getSupportedLanguages(), onPick: changeLanguage }}
        signedIn={signedIn}
        onSignIn={signIn.onSignIn}
        signInTo={signIn.signInTo}
        userMenu={userMenu}
        onSidebarToggle={showSidebar ? overlay.toggle : null}
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
        onTree={onTree}
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
  children: PropTypes.node.isRequired,
};

export default AppShell;
