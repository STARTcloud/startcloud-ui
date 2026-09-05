import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaBook, FaBuilding, FaCircleInfo, FaEnvelope, FaGear } from 'react-icons/fa6';
import { Link, useLocation } from 'react-router-dom';

import { POWERED_BY } from '../../config/brand';
import { useNotify } from '../../contexts/NoticeContext';
import { useStatus } from '../../contexts/StatusContext';
import { sessionStateShape } from '../../hooks/useSession';
import { reportRenderError } from '../../lib/logger';
import { returnTo } from '../../lib/runtime';
import { authMethod } from '../../utils/capabilities';
import { userDisplayName, userSecondaryLine } from '../../utils/identity';
import { buildRouteCrumbs, parseRoute } from '../../utils/routes';
import Avatar from '../common/Avatar';
import BrandLogo from '../common/BrandLogo';
import ErrorBoundary from '../common/ErrorBoundary';

import Footer from './Footer';
import Header from './Header';
import { NoticeCards } from './Notices';
import { notificationsAdapterShape, pushAdapterShape } from './NotificationsModal';
import { OrgLogo, organizationShape } from './OrgSwitcherModal';

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
];

const SESSION_ENDED_KEY = 'session-ended';

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

const useRouteCrumbs = ({ pathname, reserved, collections, signedIn, orgs, t }) => {
  const route = parseRoute(pathname, { reserved, collections });
  const routeOrg = route?.org || '';
  const memberLogo = orgs.organizations.find(entry => entry.name === routeOrg)?.logo || '';
  const fetchedLogo = useRouteOrgLogo(memberLogo ? '' : routeOrg, signedIn, orgs.logoFor);
  const orgIcon = (
    <OrgLogo
      org={{ logo: memberLogo || fetchedLogo }}
      size={16}
      className="rounded-circle avatar-sm"
      fallback={orgs.crumbMark || null}
    />
  );
  return signedIn ? buildRouteCrumbs({ route, t, orgIcon }) : [];
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

const AppRows = ({ showAdminBoard, showOrgConsole, extraRows }) => {
  const { t } = useTranslation();
  const { links } = useStatus();
  return (
    <>
      {showAdminBoard ? (
        <Dropdown.Item as={Link} to="/admin">
          <FaGear className="me-2" />
          {t('navbar.admin')}
        </Dropdown.Item>
      ) : null}
      {showOrgConsole ? (
        <Dropdown.Item as={Link} to="/org-console">
          <FaBuilding className="me-2" />
          {t('navbar.orgConsole')}
        </Dropdown.Item>
      ) : null}
      {extraRows}
      <Dropdown.Item as={Link} to="/about">
        <FaCircleInfo className="me-2" />
        {t('navbar.about')}
      </Dropdown.Item>
      {links.contact ? (
        <Dropdown.Item href={links.contact} target="_blank" rel="noopener noreferrer">
          <FaEnvelope className="me-2" />
          {t('navbar.contact')}
        </Dropdown.Item>
      ) : null}
      {links.docs ? (
        <Dropdown.Item href={links.docs}>
          <FaBook className="me-2" />
          {t('navbar.docs')}
        </Dropdown.Item>
      ) : null}
    </>
  );
};

AppRows.propTypes = {
  showAdminBoard: PropTypes.bool.isRequired,
  showOrgConsole: PropTypes.bool.isRequired,
  extraRows: PropTypes.node,
};

/**
 * The whole chrome around the routes, described by the host's status: the
 * header with the brand from `status.brand`, the utility links from
 * `status.links`, the route crumbs, the user menu and the notice banners;
 * the notice cards; the one scroll region with the page inside its own
 * error boundary so a page that throws keeps the chrome; and the footer.
 * The app supplies the session state, the collections the host mounts,
 * the avatar, the ticket link, the notification adapters and the menu
 * rows the host's features unlock.
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
  showAdminBoard,
  showOrgConsole,
  appRows = null,
  fetchHealth = null,
  children,
}) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const { pathname, search } = useLocation();
  const scrollRef = useRef(null);
  const { user, claims, activeOrgUuid, issuerUrl, oidc } = account;
  const signedIn = Boolean(user);
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
    logoFor: name => primary.adapter.getOrganization(name).then(org => org.logo || ''),
  };
  const crumbs = useRouteCrumbs({ pathname, reserved, collections, signedIn, orgs, t });
  useSessionEndedBanner(Boolean(account.sessionEnded) && !signedIn);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [pathname]);

  const changeLanguage = async lng => {
    account.savePreferences({ language: lng });
    await i18n.changeLanguage(lng);
  };

  const displayName = claims?.name || userDisplayName(user) || t('user.unknownUser');
  const email = userSecondaryLine({ ...user, name: displayName });

  const renderAvatar = size => (
    <Avatar
      picture={avatarUrl}
      size={size}
      fallback={<BrandLogo theme={theme} className="logo-xl flex-shrink-0" />}
    />
  );

  const onAuthPage = returnTo.onAuthPage(pathname);
  const returnPath = account.sessionEnded?.returnTo || (onAuthPage ? '' : `${pathname}${search}`);

  const links = [{ key: 'about', label: t('navbar.about'), to: '/about' }];
  if (status.links.contact) {
    links.push({ key: 'contact', label: t('navbar.contact'), href: status.links.contact });
  }
  if (status.links.docs) {
    links.push({ key: 'docs', label: t('navbar.docs'), href: status.links.docs });
  }

  const userMenu = signedIn
    ? {
        displayName,
        email,
        renderAvatar,
        oidc,
        issuerUrl,
        localProfile:
          authMethod(status) === 'backend' ? { to: '/profile', LinkComponent: Link } : null,
        organizations,
        activeOrgUuid,
        onPickOrg: account.pickOrg,
        loadOrganizations,
        orgMark: orgs.mark,
        favorites: claims?.favorite_apps || [],
        appName: status.brand.name,
        appRows: (
          <AppRows
            showAdminBoard={showAdminBoard}
            showOrgConsole={showOrgConsole}
            extraRows={appRows}
          />
        ),
        notifications,
        push,
        viewAllUrl: issuerUrl ? `${issuerUrl}/notifications` : '',
        ticketUrl,
        onSignOut,
        onSignOutEverywhere: account.signOutEverywhere,
      }
    : null;

  return (
    <div className="App d-flex flex-column vh-100">
      <Header
        brand={{
          name: status.brand.name,
          logo: <BrandLogo theme={theme} className="logo-cluster icon-with-margin-sm" />,
          to: '/',
        }}
        links={links}
        crumbs={crumbs}
        LinkComponent={Link}
        theme={{ preference: themePreference, onToggle: toggleTheme }}
        language={{ languages: getSupportedLanguages(), onPick: changeLanguage }}
        signedIn={signedIn}
        onSignIn={account.signIn}
        signInTo={returnTo.signInTo(returnPath)}
        userMenu={userMenu}
      />
      <NoticeCards LinkComponent={Link} />
      <div ref={scrollRef} className="container-fluid app-scroll py-3">
        <ErrorBoundary showErrorDetails={import.meta.env.DEV} onError={reportRenderError}>
          {children}
        </ErrorBoundary>
      </div>
      <Footer
        appName={status.brand.name}
        version={status.version}
        repoUrl={status.brand.repo}
        poweredBy={POWERED_BY}
        fetchHealth={fetchHealth}
      />
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
  showAdminBoard: PropTypes.bool.isRequired,
  showOrgConsole: PropTypes.bool.isRequired,
  appRows: PropTypes.node,
  fetchHealth: PropTypes.func,
  children: PropTypes.node.isRequired,
};

export default AppShell;
