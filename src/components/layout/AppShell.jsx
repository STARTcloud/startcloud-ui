import PropTypes from 'prop-types';
import { Fragment, useContext, useEffect, useRef, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBook, FaBuilding, FaCircleInfo, FaCode, FaEnvelope, FaGear } from 'react-icons/fa6';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { POWERED_BY } from '../../config/brand';
import { ColumnContext } from '../../contexts/ColumnContext';
import { useCrumb } from '../../contexts/CrumbContext';
import { useNotify } from '../../contexts/NoticeContext';
import { NavbarSearchContext, hasPanel, useNavbarSearch } from '../../contexts/SearchContext';
import { useStatus } from '../../contexts/StatusContext';
import { sessionStateShape } from '../../hooks/useSession';
import { useShortcuts } from '../../hooks/useShortcuts';
import { useSidebarBadges } from '../../hooks/useSidebarBadges';
import { useSidebarSize } from '../../hooks/useSidebarSize';
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
import { sidebarSizeShape } from './FooterPane';
import Header from './Header';
import { NoticeCards } from './Notices';
import { notificationsAdapterShape, pushAdapterShape } from './NotificationsModal';
import { OrgLogo, organizationShape } from './OrgSwitcherModal';
import { shellShortcutRows } from './shortcutRows';
import ShortcutsModal, { shortcutRowShape } from './ShortcutsModal';
import Sidebar, { sidebarGroupShape } from './Sidebar';
import UserMenu from './UserMenu';

const SESSION_ENDED_KEY = 'session-ended';

const DISCOVER_PATH = '/organizations/discover';

const NARROW_QUERY = '(max-width: 899.98px)';

const USER_MENU_TOGGLE = '.user-menu > .nav-link';

const LOCAL_PROFILE_PATHS = { backend: '/profile', cookie: '/user/profile', apikey: '/profile' };

const localProfileFor = status => {
  const to = LOCAL_PROFILE_PATHS[authMethod(status)];
  return to ? { to, LinkComponent: Link } : null;
};

/**
 * The links of the user menu's universal rows: on a `cookie` host the
 * issuer's own pages, elsewhere the identity provider's notifications
 * page and, wherever the host serves a local profile page, that page's
 * Preferences section as the Preferences row, the identity card's glyph
 * being the way to the identity provider; a host with no local page
 * leaves the row to the identity provider's preferences.
 */
const menuLinksFor = ({ status, cookie, issuerUrl }) => {
  if (cookie) {
    return {
      issuerUrl: '',
      viewAllUrl: '',
      viewAllTo: hasFeature(status, 'inbox') ? '/notifications' : '',
      preferencesTo: '/user/profile/preferences',
    };
  }
  const local = localProfileFor(status);
  return {
    issuerUrl,
    viewAllUrl: issuerUrl ? `${issuerUrl}/notifications` : '',
    viewAllTo: '',
    preferencesTo: local ? `${local.to}/preferences` : '',
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
    allOrganizations: orgs.all,
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

/**
 * The crumbs `routeCrumbParent` answers for the route: the whole trail
 * its `crumbs` resolver builds, or the parent row's crumbs with the
 * page's name its `name` resolver answers after them; none for a route
 * it answers null for. Each resolver receives `{ activeOrganization,
 * pageName, pageNoun, status, t }`.
 *
 * @param {Object} options - The sidebar groups, the route's entry, the memberships, the active organization's uuid, the page's name and noun, the status and `t`
 * @returns {Array} The crumbs
 */
const pageCrumbsFor = ({
  groups,
  parented,
  organizations,
  activeOrgUuid,
  pageName,
  pageNoun,
  status,
  t,
}) => {
  if (!parented) {
    return [];
  }
  const activeOrganization = organizations.find(entry => entry.uuid === activeOrgUuid) || null;
  const held = { activeOrganization, pageName, pageNoun, status, t };
  if (parented.crumbs) {
    return parented.crumbs(held);
  }
  return parentedCrumbs({ groups, parent: parented.parent, name: parented.name(held), t });
};

const sidebarMatchFor = ({
  showSidebar,
  groups,
  pathname,
  routeCrumbParent,
  organizations,
  activeOrgUuid,
  pageName,
  pageNoun,
  status,
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
      pageNoun,
      status,
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

const useSessionEndedBanner = ended => {
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
    notify('warning', text, { tier: 'banner', key: SESSION_ENDED_KEY });
  }, [ended, notify, t]);
};

const useSidebarOverlay = pathname => {
  const [openAt, setOpenAt] = useState('');
  return {
    open: openAt === pathname,
    toggle: () => setOpenAt(previous => (previous === pathname ? '' : pathname)),
    close: () => setOpenAt(''),
  };
};

const openUserMenu = () => document.querySelector(USER_MENU_TOGGLE)?.click();

/**
 * The keyboard shortcuts of the shell: the one keydown listener over the
 * shell's rows and the mounted features' rows, and the Keyboard Shortcuts
 * modal's state. `/` and Ctrl+Alt+F open the navbar search through the
 * context's `openBox` while the host lists `search` and the route is not
 * an auth path, signed in or out, Ctrl+/ toggles its filter panel while
 * the page registered filter groups, `=` collapses the sidebar to the
 * rail and back, or under 900px opens and closes the overlay, `p` opens
 * the user menu, `?` the modal, Shift+Z then Shift+Z runs the logout
 * action, the identity provider's everywhere while the session is its
 * own.
 *
 * @param {Object} options - The shell's side
 * @returns {{ rows: Array<Object>, searchOn: boolean, show: boolean, open: Function, close: Function }} The rows, whether the navbar search draws and the modal's state
 */
const useShellShortcuts = ({
  status,
  account,
  signedIn,
  onAuthPage,
  collections,
  discoverTo,
  notifications,
  showSidebar,
  overlay,
  sidebarSize,
  onSignOut,
  shortcuts,
}) => {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const search = useContext(NavbarSearchContext);
  const binding = useNavbarSearch(search?.store);
  const searchOn = !onAuthPage && Boolean(search) && hasFeature(status, 'search');
  const rows = [
    ...shellShortcutRows({
      status,
      signedIn,
      collections,
      discoverTo,
      profile: {
        to: localProfileFor(status)?.to || '',
        href: account.issuerUrl ? `${account.issuerUrl}/user/profile` : '',
      },
      inboxTo: hasFeature(status, 'inbox') && notifications ? '/notifications' : '',
      search: {
        on: searchOn,
        filters: searchOn && hasPanel(binding) && !search.everywhere,
        open: () => search?.openBox(),
        toggleFilters: () => search?.setPanelOpen(current => !current),
      },
      sidebar: {
        on: showSidebar,
        toggle: () =>
          window.matchMedia(NARROW_QUERY).matches
            ? overlay.toggle()
            : sidebarSize.toggleMinimized(),
      },
      help: () => setShow(true),
      userMenu: openUserMenu,
      logout: () => (account.oidc ? account.signOutEverywhere() : onSignOut()),
    }),
    ...shortcuts,
  ];
  useShortcuts(rows, { navigate, root: document });
  return { rows, searchOn, show, open: () => setShow(true), close: () => setShow(false) };
};

const menuFor = ({ cookie, issuerUrl, localProfile, onAuthPage, rows, adapters }) => ({
  appRows: cookie && onAuthPage ? null : rows,
  showPreferences: cookie || Boolean(issuerUrl) || Boolean(localProfile),
  ...adapters,
});

const signInFor = ({ account, anonymous, onAuthPage, pathname, search }) => {
  if (anonymous || onAuthPage) {
    return { onSignIn: null, signInTo: '' };
  }
  const returnPath = account.sessionEnded?.returnTo || `${pathname}${search}`;
  return { onSignIn: account.signIn, signInTo: returnTo.signInTo(returnPath) };
};

const columnGates = ({ cookie, showAbout, showOrgConsole }) => ({
  showAbout,
  showOrgConsole: showOrgConsole && !cookie,
});

const identityFor = ({ user, claims, t }) => {
  const displayName = claims?.name || userDisplayName(user) || t('user.unknownUser');
  return { displayName, email: userSecondaryLine({ ...user, name: displayName }) };
};

/**
 * Where the action menu and the user menu draw: while an `actionMenu` is
 * handed, a person is signed in, a column draws and there is a user
 * menu, the header's account slot takes the action menu and the user
 * menu becomes the sidebar's foot, a drop-up with the avatar alone in
 * the rail; otherwise the header keeps the user menu, the action menu
 * beside it while signed in, and the foot is empty.
 *
 * @param {Object} options - The action menu, whether signed in, whether the column draws and the user menu
 * @returns {{ userMenu: Object|null, actionMenu: import('react').ReactNode, foot: Function|null }} The placements
 */
const accountSlots = ({ actionMenu, signedIn, showSidebar, userMenu }) => {
  const swap = Boolean(actionMenu) && signedIn && showSidebar && Boolean(userMenu);
  return {
    userMenu: swap ? null : userMenu,
    actionMenu: signedIn ? actionMenu : null,
    foot: swap ? minimized => <UserMenu {...userMenu} drop="up" rail={minimized} /> : null,
  };
};

/**
 * The footer while the host lists the `footer` token, nothing otherwise:
 * the name and version from the status, `about` whether the role has
 * About text, `pane` the views hook of the footer's pane or null, and
 * `sidebar` the sidebar's size for the corner handle, null without a
 * column.
 */
const ShellFooter = ({ fetchHealth, about, pane, sidebar }) => {
  const status = useStatus();
  if (!hasFeature(status, 'footer')) {
    return null;
  }
  return (
    <Footer
      appName={status.brand.name}
      version={status.version}
      about={about}
      poweredBy={POWERED_BY}
      fetchHealth={fetchHealth}
      streamed={hasFeature(status, 'events') && Boolean(status.events)}
      pane={pane}
      sidebar={sidebar}
    />
  );
};

ShellFooter.propTypes = {
  fetchHealth: PropTypes.func,
  about: PropTypes.bool.isRequired,
  pane: PropTypes.func,
  sidebar: sidebarSizeShape,
};

const appRowsFor = ({
  showAbout,
  showAdminBoard,
  showOrgConsole,
  extraRows,
  links = {},
  apiRows,
  t,
}) => {
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
  apiRows.forEach(row => {
    rows.push(
      <Dropdown.Item key={row.key} href={row.href} target="_blank" rel="noopener noreferrer">
        <FaCode className="me-2" />
        {t(row.labelKey)}
      </Dropdown.Item>
    );
  });
  return rows.length > 0 ? rows : null;
};

/**
 * The double-click on a modal's header that zooms the dialog: takes the
 * `dblclick` event, leaves one outside a `.modal-header` or on a button,
 * link, input, select or textarea inside it alone, and otherwise toggles
 * `modal-zoomed` on the header's `.modal-dialog`.
 *
 * @param {MouseEvent} event - The document's `dblclick` event
 */
const zoomModalOnHeaderDoubleClick = event => {
  const header = event.target.closest('.modal-header');
  if (!header || event.target.closest('button, a, input, select, textarea')) {
    return;
  }
  header.closest('.modal-dialog').classList.toggle('modal-zoomed');
};

/**
 * The whole chrome around the routes, drawn from the host's status and
 * the props the app hands it: the sidebar while `sidebar` carries
 * entries, the header with the brand (in the sidebar's top while one
 * draws), the crumbs, the cluster, the user menu and the notice banners,
 * the notice cards, the page's column slot beside the one scroll region,
 * handed to the pages through `ColumnContext` so a host's column stands
 * under the header and above the footer the way the sidebar stands beside
 * the stack, the scroll region with the page inside its own error
 * boundary, the footer while the host lists `footer`, with its pane
 * while `footerPane` answers a view, the double-click on any modal's
 * header that zooms the dialog to 95% of the viewport, a second one
 * returning it, and the keyboard shortcuts of `useShellShortcuts` with
 * the mounted features' `shortcuts` rows, the Keyboard Shortcuts modal
 * opened by `?`, the sidebar foot's keyboard button and the user menu's
 * Keyboard shortcuts row.
 *
 * The crumbs come from the route. With a column: the crumbs of the
 * sidebar row the route matches, else the crumbs `routeCrumbParent`
 * answers for the route, else the route parser's crumbs on a catalog
 * route, else the title `routeTitleKey` names on a reserved route.
 * Without a column: the route parser's crumbs alone.
 *
 * The column and the app section are hidden on the bare routes, the
 * auth routes and the device activation page, and Sign in is hidden on
 * the auth routes. While `actionMenu` is handed, a person is
 * signed in and a column draws, the header's account slot draws the
 * action menu and the user menu draws at the sidebar's foot.
 * `allOrganizations` puts All organizations first in the switcher.
 * `apiRows`, `[{ key, labelKey, href }]`, draw last in the app section,
 * each opened in a new tab.
 */
const AppShell = ({
  account,
  avatarUrl,
  mode,
  resolvedMode,
  toggleMode,
  setMode,
  onSignOut,
  getSupportedLanguages,
  collections,
  organizations,
  allOrganizations,
  apiRows,
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
  actionMenu = null,
  footerPane,
  routeTitleKey = null,
  routeCrumbParent = null,
  shortcuts,
  children,
}) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const { pathname, search } = useLocation();
  const { name: pageName, noun: pageNoun } = useCrumb();
  const scrollRef = useRef(null);
  const [column, setColumn] = useState(null);
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
    all: allOrganizations,
    load: loadOrganizations,
    mark: <BrandLogo className="logo-md icon-with-margin" />,
    crumbMark: <BrandLogo className="logo-sm" />,
    logoFor: logoResolver(primary),
  };
  const onAuthPage = returnTo.onAuthPage(pathname);
  const onBarePage = returnTo.onBarePage(pathname);
  const showSidebar = sidebar.length > 0 && !onBarePage;
  const overlay = useSidebarOverlay(pathname);
  const sidebarSize = useSidebarSize();
  const badges = useSidebarBadges({ status, entries: showSidebar ? sidebar : [] });
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
      pageNoun,
      status,
      t,
    }),
    routeCrumbs: route.crumbs,
    reservedRoute: route.reserved,
    titleKey: routeTitleKey ? routeTitleKey(pathname) : '',
    t,
  });
  useSessionEndedBanner(Boolean(account.sessionEnded) && !signedIn && !anonymous);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    document.addEventListener('dblclick', zoomModalOnHeaderDoubleClick);
    return () => document.removeEventListener('dblclick', zoomModalOnHeaderDoubleClick);
  }, []);

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

  const keys = useShellShortcuts({
    status,
    account,
    signedIn,
    onAuthPage,
    collections,
    discoverTo,
    notifications,
    showSidebar,
    overlay,
    sidebarSize,
    onSignOut,
    shortcuts,
  });

  const userMenu = buildUserMenu({
    account,
    status,
    cookie,
    identity: { ...identityFor({ user, claims, t }), renderAvatar },
    orgs,
    menu: menuFor({
      cookie,
      issuerUrl: account.issuerUrl,
      localProfile: localProfileFor(status),
      onAuthPage: onBarePage,
      rows: appRowsFor({
        ...gates,
        showAdminBoard,
        extraRows: appRows,
        links: status.links,
        apiRows,
        t,
      }),
      adapters: { notifications, push, ticketUrl, onSignOut, onShortcuts: keys.open },
    }),
  });

  const brand = {
    name: status.brand.name,
    logo: <BrandLogo className="logo-cluster icon-with-margin-sm" />,
    to: '/',
  };

  const readout = {
    app: status.brand.name,
    version: status.version,
    host: window.location.hostname,
  };

  const slots = accountSlots({ actionMenu, signedIn, showSidebar, userMenu });

  const stack = (
    <>
      <Header
        brand={showSidebar ? null : brand}
        crumbs={crumbs}
        LinkComponent={Link}
        mode={{
          preference: mode,
          resolved: resolvedMode,
          onToggle: toggleMode,
          onPick: setMode,
        }}
        language={{ languages: getSupportedLanguages(), onPick: changeLanguage }}
        signedIn={signedIn}
        searchOn={keys.searchOn}
        onSignIn={signIn.onSignIn}
        signInTo={signIn.signInTo}
        userMenu={slots.userMenu}
        actionMenu={slots.actionMenu}
        onSidebarToggle={showSidebar ? overlay.toggle : null}
        discoverTo={discoverTo}
        ticketUrl={ticketUrl}
        readout={readout}
      />
      <NoticeCards LinkComponent={Link} />
      <div className="app-body d-flex flex-grow-1 min-height-0">
        <div ref={setColumn} className="app-column" />
        <div ref={scrollRef} className="container-fluid app-scroll py-3">
          <ErrorBoundary showErrorDetails={import.meta.env.DEV} onError={reportRenderError}>
            <ColumnContext.Provider value={column}>{children}</ColumnContext.Provider>
          </ErrorBoundary>
        </div>
      </div>
      <ShellFooter
        fetchHealth={fetchHealth}
        about={showAbout}
        pane={footerPane}
        sidebar={showSidebar ? sidebarSize : null}
      />
      <ShortcutsModal show={keys.show} rows={keys.rows} onHide={keys.close} />
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
        size={sidebarSize}
        readout={readout}
        foot={slots.foot}
        onShortcuts={keys.open}
      />
      <div className="app-stack d-flex flex-column flex-grow-1 min-width-0">{stack}</div>
    </div>
  );
};

AppShell.propTypes = {
  account: sessionStateShape.isRequired,
  avatarUrl: PropTypes.string.isRequired,
  mode: PropTypes.string.isRequired,
  resolvedMode: PropTypes.string.isRequired,
  toggleMode: PropTypes.func.isRequired,
  setMode: PropTypes.func.isRequired,
  onSignOut: PropTypes.func.isRequired,
  getSupportedLanguages: PropTypes.func.isRequired,
  collections: PropTypes.array.isRequired,
  organizations: PropTypes.arrayOf(organizationShape).isRequired,
  allOrganizations: PropTypes.bool.isRequired,
  apiRows: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      labelKey: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired,
    })
  ).isRequired,
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
  actionMenu: PropTypes.node,
  footerPane: PropTypes.func,
  routeTitleKey: PropTypes.func,
  routeCrumbParent: PropTypes.func,
  shortcuts: PropTypes.arrayOf(shortcutRowShape).isRequired,
  children: PropTypes.node.isRequired,
};

export default AppShell;
