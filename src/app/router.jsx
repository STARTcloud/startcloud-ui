import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';

import BrandLogo from '../components/common/BrandLogo';
import NotAvailableStub from '../components/common/NotAvailableStub';
import { notificationsAdapterShape } from '../components/layout/NotificationsModal';
import {
  ACTIVE_ORG_KEY,
  JOIN_INTENT_KEY,
  LOGIN_METHOD_KEY,
  SILENT_SSO_KEY,
  UPDATE_COMMAND,
} from '../config/constants';
import { GuardProvider } from '../contexts/GuardContext';
import { useStatus } from '../contexts/StatusContext';
import { AboutRoute } from '../features/about';
import {
  AdminPage,
  adminConfig,
  resumeUser,
  sidebar as adminSidebar,
  storage,
  suspendUser,
  updateStatus,
} from '../features/admin';
import {
  CallbackPage,
  InvitePage,
  LoginPage,
  MagicLinkPage,
  PasswordRecoveryPage,
  PasswordResetPage,
  RegisterPage,
  VerifyLinkPage,
  acceptInvitation,
  activeInvitations,
  invite,
  methods,
  register,
  removeInvitation,
  resendVerification,
  validateInvitation,
  verifyMail,
} from '../features/auth';
import {
  CollectionPage,
  HomePage,
  ItemPage,
  OrgPage,
  ProviderPage,
  VersionPage,
  collectionShape,
  pageContextShape,
} from '../features/catalog';
import { ErrorPage } from '../features/errors';
import {
  IDENTITY_ADMIN_PAGES,
  IdentityAdminPage,
  sidebar as identitySidebar,
} from '../features/identity';
import { IntegrationsPage, issuerIntegrations } from '../features/integrations';
import {
  CibaApprovePage,
  CodeDisplayPage,
  ConsentPage,
  DesktopContinuePage,
  DeviceActivatePage,
  DeviceActivatedPage,
  FrontChannelLogoutPage,
  LinkAccountPage,
  LogoutConfirmPage,
} from '../features/interstitials';
import { InboxPage } from '../features/notifications';
import {
  AccountTypeStep,
  BackupCodesPage,
  EmailCodeStep,
  NameStep,
  OnboardingHub,
  PhoneStep,
  TeamNameStep,
  TermsPage,
  TfaEnrollChoiceStep,
  TotpEnrollPage,
} from '../features/onboarding';
import {
  DiscoveryPage,
  OrgConsolePage,
  OrganizationsPage,
  approveRequest,
  createJoinRequest,
  denyRequest,
  discoverOrganizations,
  issuerOrganizations,
  organizationRequests,
  organizationUsers,
  organizationsWithUsers,
  removeMember,
  removeOrganization,
  resumeOrganization,
  setAccessMode,
  setMemberRole,
  suspendOrganization,
  updateOrganization,
} from '../features/organizations';
import { PolicyPage } from '../features/policies';
import {
  ProfilePage,
  cancelRequest,
  changeEmail,
  changeName,
  changePassword,
  issuerAccount,
  leaveOrganization,
  myRequests,
  placesKey,
  removeAccount,
  serviceAccounts,
  setPrimaryOrganization,
  sidebar as profileSidebar,
  stepUp,
} from '../features/profile';
import { SearchPage } from '../features/search';
import { SetupPage, setupApi } from '../features/setup';
import { TfaCodePage, TfaMethodPage } from '../features/tfa';
import { FleetPage, VmPage, sidebar as vdiSidebar } from '../features/vdi';
import { sessionStateShape } from '../hooks/useSession';
import { getOrganization, userOrganizations } from '../lib/organizations';
import { events, returnTo, session } from '../lib/runtime';
import { authMethod, hasFeature, hasFeatureStrict } from '../utils/capabilities';
import { gravatarProfile } from '../utils/gravatar';
import { isMember } from '../utils/membership';

const authAdapter = {
  methods,
  register,
  validateInvitation,
  acceptInvitation,
  loginMethodKey: LOGIN_METHOD_KEY,
  silentSsoKey: SILENT_SSO_KEY,
};

const accountAdapter = {
  gravatarProfile,
  changePassword,
  changeEmail,
  changeName,
  remove: removeAccount,
  verifyMail,
  resendVerification,
  organizations: userOrganizations,
  leave: leaveOrganization,
  setPrimary: setPrimaryOrganization,
  requests: myRequests,
  cancelRequest,
  serviceAccounts,
};

const organizationsAdapter = {
  get: getOrganization,
  update: updateOrganization,
  accessMode: setAccessMode,
  users: organizationUsers,
  memberRole: setMemberRole,
  removeMember,
  invite,
  invitations: activeInvitations,
  removeInvitation,
  requests: organizationRequests,
  approveRequest,
  denyRequest,
  discover: discoverOrganizations,
  join: createJoinRequest,
  gravatarProfile,
};

const backendAdminMembers = {
  organizationsWithUsers,
  organization: getOrganization,
  updateOrganization,
  accessMode: setAccessMode,
  suspendOrganization,
  resumeOrganization,
  removeOrganization,
  removeMember,
  removeUser: removeAccount,
  suspendUser,
  resumeUser,
  gravatarProfile,
  storage,
};

const hasConfigFiles = status => Array.isArray(status?.config) && status.config.length > 0;

const adminAdapterFor = status => {
  const method = authMethod(status);
  if (method === 'cookie') {
    return {};
  }
  return {
    ...(method === 'backend' ? backendAdminMembers : {}),
    ...(hasConfigFiles(status) ? { config: adminConfig } : {}),
    updateStatus,
  };
};

const firstAdminPage = admin => (admin.organizationsWithUsers ? 'organizations' : 'config');

const PAGE_TITLES = {
  '/about': 'navbar.about',
  '/search': 'search.page.title',
  '/organizations/discover': 'discovery.title',
  '/login': 'auth:login.pageTitle',
  '/login/magic': 'auth:login.magic.title',
  '/auth/callback': 'auth:login.pageTitle',
  '/register': 'auth:register.pageTitle',
  '/registration': 'auth:register.pageTitle',
  '/registration/verify': 'auth:register.pageTitle',
  '/invite/:token': 'inviteAccept.title',
  '/profile': 'profile.pageTitle',
  '/user/profile': 'profile.pageTitle',
  '/user/organizations': 'organizations.title',
  '/user/integrations': 'integrations.title',
  '/org-console': 'orgConsole.pageTitle',
  '/notifications': 'inbox.title',
  '/admin': 'admin.pageTitle',
  '/admin/terms': 'admin.terms.title',
  '/setup': 'setup.title',
  '/vm/:instance': 'vdi.vm.title',
  '/authenticator': 'auth:tfa.title',
  '/authenticator-method': 'auth:tfa.choose.title',
  '/passwordRecovery': 'auth:recovery.title',
  '/passwordReset': 'auth:reset.title',
  '/complete-onboarding': 'auth:onboarding.password',
  '/complete-onboarding/name': 'auth:onboarding.name.title',
  '/complete-onboarding/phone-setup': 'auth:onboarding.phone.title',
  '/complete-onboarding/email-verification': 'auth:onboarding.email.title',
  '/complete-onboarding/choose-2fa-method': 'auth:onboarding.tfa.title',
  '/complete-onboarding/backup-codes': 'auth:onboarding.codes.title',
  '/complete-onboarding/account-type': 'auth:onboarding.account.title',
  '/complete-onboarding/team-name': 'auth:onboarding.team.title',
  '/qrcode': 'auth:onboarding.qr.title',
  '/public/policies/:name': 'auth:policy.pageTitle',
  '/oauth2/consent': 'auth:consent.title',
  '/oauth2/accept-terms': 'auth:terms.pageTitle',
  '/provider-registration/tos': 'auth:terms.pageTitle',
  '/activate': 'auth:device.title',
  '/activated': 'auth:device.connected',
  '/ciba/approve': 'auth:ciba.title',
  '/connect/logout/confirm': 'auth:logout.title',
  '/connect/logout/frontchannel': 'auth:logout.signingOut',
  '/oauth2/code': 'auth:code.title',
  '/continue': 'auth:desktop.title',
  '/link-account-consent': 'auth:link.title',
  '/error': 'errors.title.other',
};

const titleOf = path => PAGE_TITLES[path];

const prefixOf = path => path.split('/:')[0];

const TITLE_PREFIXES = [...new Set(Object.keys(PAGE_TITLES).map(prefixOf))].sort(
  (a, b) => b.length - a.length
);

/**
 * The registered title key of a reserved route: `PAGE_TITLES` is the one
 * table every route registration below reads its title from, so a
 * route's title lives in one place; the lookup takes the longest
 * registered path, its parameter segments dropped, that the pathname
 * equals or descends from, and the shell draws it as the second crumb
 * after the root crumb when no sidebar row matches the route.
 *
 * @param {string} pathname - The current path
 * @returns {string} The title key, empty when no route is registered
 */
export const routeTitleKey = pathname => {
  const hit = TITLE_PREFIXES.find(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  return hit ? titleOf(Object.keys(PAGE_TITLES).find(path => prefixOf(path) === hit)) : '';
};

/**
 * Every mounted feature's `sidebar(status, account)` answer, concatenated
 * in the order the column draws them: the profile feature's Account
 * group, the identity feature's operator group while the host's first
 * `auth` token is `cookie`, the vdi feature's Fleet group while the host
 * advertises `fleet`, and the shared admin feature's entries over the
 * admin adapter the host gets; empty means no column.
 *
 * @param {Object} options - The shell's side
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {Object} options.account - The session state from `useSession`
 * @returns {Array} The sidebar groups `AppShell` takes as `sidebar`
 */
export const sidebarEntries = ({ status, account }) => {
  const method = authMethod(status);
  return [
    ...profileSidebar(status, account),
    ...(method === 'cookie' ? identitySidebar(status, account) : []),
    ...vdiSidebar(status, account),
    ...adminSidebar(status, account, adminAdapterFor(status)),
  ];
};

const Stub = ({ titleKey, token }) => {
  const { t } = useTranslation();
  return <NotAvailableStub title={t(titleKey)} tokenLabel={token} />;
};

Stub.propTypes = {
  titleKey: PropTypes.string.isRequired,
  token: PropTypes.string.isRequired,
};

const AdminRoute = ({ globalAdmin, user = null, page = '' }) => {
  const status = useStatus();
  const admin = adminAdapterFor(status);
  if (!hasFeature(status, 'admin')) {
    return <Stub titleKey={titleOf('/admin')} token="admin" />;
  }
  return (
    <GuardProvider stepUp={stepUp} hasPassword={Boolean(user?.has_local_auth)}>
      <AdminPage
        session={session}
        returnTo={returnTo}
        allowed={globalAdmin}
        admin={admin}
        activeOrgKey={ACTIVE_ORG_KEY}
        updateCommand={UPDATE_COMMAND(status.role)}
        page={page || firstAdminPage(admin)}
      />
    </GuardProvider>
  );
};

AdminRoute.propTypes = {
  globalAdmin: PropTypes.bool.isRequired,
  user: PropTypes.object,
  page: PropTypes.string,
};

const IdentityAdminRoute = ({ globalAdmin, user, page }) => {
  const status = useStatus();
  if (!hasFeature(status, 'admin')) {
    return <Stub titleKey={titleOf('/admin')} token="admin" />;
  }
  if (page === 'terms' && !hasFeature(status, 'policies')) {
    return <Stub titleKey={titleOf('/admin/terms')} token="policies" />;
  }
  return (
    <IdentityAdminPage
      session={session}
      returnTo={returnTo}
      allowed={globalAdmin}
      stepUp={stepUp}
      user={user}
      page={page}
    />
  );
};

IdentityAdminRoute.propTypes = {
  globalAdmin: PropTypes.bool.isRequired,
  user: PropTypes.object,
  page: PropTypes.string.isRequired,
};

const DiscoverLink = () => {
  const { t } = useTranslation();
  return (
    <Link to="/organizations/discover" className="btn btn-sm btn-outline-primary">
      {t('discovery.discoverButton')}
    </Link>
  );
};

const OrgRoute = ({ collections, organizations, context }) => {
  const { org } = useParams();
  return (
    <OrgPage
      collections={collections}
      org={org}
      member={isMember(organizations, org)}
      context={context}
    />
  );
};

OrgRoute.propTypes = {
  collections: PropTypes.arrayOf(collectionShape).isRequired,
  organizations: PropTypes.array.isRequired,
  context: pageContextShape.isRequired,
};

const OrgCollectionRoute = ({ collection, organizations, context }) => {
  const { org } = useParams();
  return (
    <CollectionPage
      collection={collection}
      org={org}
      member={isMember(organizations, org)}
      context={context}
    />
  );
};

OrgCollectionRoute.propTypes = {
  collection: collectionShape.isRequired,
  organizations: PropTypes.array.isRequired,
  context: pageContextShape.isRequired,
};

const ItemRoute = ({ collection, context }) => {
  const { org, name } = useParams();
  return <ItemPage collection={collection} org={org} name={name} context={context} />;
};

ItemRoute.propTypes = {
  collection: collectionShape.isRequired,
  context: pageContextShape.isRequired,
};

const VersionRoute = ({ collection, context }) => {
  const { org, name, version } = useParams();
  return (
    <VersionPage
      collection={collection}
      org={org}
      name={name}
      version={version}
      context={context}
    />
  );
};

VersionRoute.propTypes = {
  collection: collectionShape.isRequired,
  context: pageContextShape.isRequired,
};

const VmRoute = ({ theme, user }) => {
  const { instance } = useParams();
  return <VmPage instance={instance} theme={theme} user={user} />;
};

VmRoute.propTypes = {
  theme: PropTypes.string.isRequired,
  user: PropTypes.object,
};

const ProviderRoute = ({ collection, context }) => {
  const { org, name, version, provider } = useParams();
  return (
    <ProviderPage
      collection={collection}
      org={org}
      name={name}
      version={version}
      provider={provider}
      context={context}
    />
  );
};

ProviderRoute.propTypes = {
  collection: collectionShape.isRequired,
  context: pageContextShape.isRequired,
};

const collectionRoutes = ({ collection, collections, organizations, context }) => {
  const base = collection.segment ? `/:org/${collection.segment}` : '/:org';
  const routes = [];
  if (collection.segment) {
    const orgCollectionElement = (
      <OrgCollectionRoute collection={collection} organizations={organizations} context={context} />
    );
    routes.push(
      <Route
        key={`/${collection.segment}`}
        path={`/${collection.segment}`}
        element={<CollectionPage collection={collection} org="" member={false} context={context} />}
      />,
      <Route key={base} path={base} element={orgCollectionElement} />
    );
  } else {
    routes.push(
      <Route
        key={base}
        path={base}
        element={
          <OrgRoute collections={collections} organizations={organizations} context={context} />
        }
      />
    );
  }
  routes.push(
    <Route
      key={`${base}/:name`}
      path={`${base}/:name`}
      element={<ItemRoute collection={collection} context={context} />}
    />
  );
  if (collection.hasVersions) {
    routes.push(
      <Route
        key={`${base}/:name/:version`}
        path={`${base}/:name/:version`}
        element={<VersionRoute collection={collection} context={context} />}
      />
    );
  }
  if (collection.hasVersions) {
    routes.push(
      <Route
        key={`${base}/:name/:version/:provider`}
        path={`${base}/:name/:version/:provider`}
        element={<ProviderRoute collection={collection} context={context} />}
      />
    );
  }
  return routes;
};

const gated = (open, element, titleKey, token) =>
  open ? element : <Stub titleKey={titleKey} token={token} />;

const gatedRoutes = rows =>
  rows.map(({ path, open, element, token }) => (
    <Route key={path} path={path} element={gated(open, element, titleOf(path), token)} />
  ));

const signInRoutes = ({ status, cookie }) => {
  const tfa = cookie && hasFeature(status, 'tfa');
  const local = cookie && hasFeature(status, 'local-accounts');
  const pages = { session, returnTo };
  return gatedRoutes([
    {
      path: '/login/magic',
      open: cookie,
      element: <MagicLinkPage returnTo={returnTo} />,
      token: 'cookie',
    },
    {
      path: '/authenticator',
      open: tfa,
      element: <TfaCodePage returnTo={returnTo} />,
      token: 'tfa',
    },
    {
      path: '/authenticator-method',
      open: tfa,
      element: <TfaMethodPage returnTo={returnTo} />,
      token: 'tfa',
    },
    {
      path: '/passwordRecovery',
      open: local,
      element: <PasswordRecoveryPage {...pages} />,
      token: 'local-accounts',
    },
    {
      path: '/passwordReset',
      open: local,
      element: <PasswordResetPage {...pages} />,
      token: 'local-accounts',
    },
    {
      path: '/registration',
      open: local,
      element: <RegisterPage {...pages} auth={authAdapter} />,
      token: 'local-accounts',
    },
    {
      path: '/registration/verify',
      open: local,
      element: <VerifyLinkPage returnTo={returnTo} />,
      token: 'local-accounts',
    },
  ]);
};

const onboardingRoutes = ({ status, cookie }) => {
  const onboarding = cookie && hasFeature(status, 'onboarding');
  const tfa = cookie && hasFeature(status, 'tfa');
  const policies = cookie && hasFeature(status, 'policies');
  const step = (path, open, Element, token) => ({
    path,
    open,
    element: <Element returnTo={returnTo} />,
    token,
  });
  return gatedRoutes([
    step('/complete-onboarding', onboarding, OnboardingHub, 'onboarding'),
    step('/complete-onboarding/name', onboarding, NameStep, 'onboarding'),
    step('/complete-onboarding/phone-setup', onboarding, PhoneStep, 'onboarding'),
    step('/complete-onboarding/email-verification', onboarding, EmailCodeStep, 'onboarding'),
    step('/complete-onboarding/choose-2fa-method', onboarding && tfa, TfaEnrollChoiceStep, 'tfa'),
    step('/qrcode', tfa, TotpEnrollPage, 'tfa'),
    step('/complete-onboarding/backup-codes', onboarding, BackupCodesPage, 'onboarding'),
    step(
      '/complete-onboarding/account-type',
      onboarding && hasFeature(status, 'org-console'),
      AccountTypeStep,
      'org-console'
    ),
    step('/complete-onboarding/team-name', onboarding, TeamNameStep, 'onboarding'),
    step('/oauth2/accept-terms', policies, TermsPage, 'policies'),
    step('/provider-registration/tos', policies, TermsPage, 'policies'),
    {
      path: '/public/policies/:name',
      open: hasFeature(status, 'policies'),
      element: <PolicyPage />,
      token: 'policies',
    },
  ]);
};

const interstitialRoutes = ({ status, cookie }) => {
  const open = hasFeature(status, 'interstitials');
  const signedIn = cookie && open;
  const row = (path, gate, element) => ({ path, open: gate, element, token: 'interstitials' });
  return gatedRoutes([
    row('/oauth2/consent', signedIn, <ConsentPage returnTo={returnTo} />),
    row('/activate', open, <DeviceActivatePage />),
    row('/activated', open, <DeviceActivatedPage />),
    row('/ciba/approve', signedIn, <CibaApprovePage />),
    row('/connect/logout/confirm', signedIn, <LogoutConfirmPage returnTo={returnTo} />),
    row('/connect/logout/frontchannel', open, <FrontChannelLogoutPage returnTo={returnTo} />),
    row('/oauth2/code', open, <CodeDisplayPage />),
    row('/continue', open, <DesktopContinuePage />),
    row('/link-account-consent', signedIn, <LinkAccountPage returnTo={returnTo} />),
  ]);
};

const issuerProfile = ({ account, status, globalAdmin }) => (
  <ProfilePage
    session={session}
    events={events}
    returnTo={returnTo}
    account={issuerAccount}
    activeOrgUuid={account.activeOrgUuid}
    localAccounts={hasFeature(status, 'local-accounts')}
    issuerUrl={account.issuerUrl}
    admin={globalAdmin}
  />
);

const signedInRoutes = ({ status, cookie, account, globalAdmin, notifications }) => {
  const profile = issuerProfile({ account, status, globalAdmin });
  return gatedRoutes([
    { path: '/user/profile', open: cookie, element: profile, token: 'cookie' },
    {
      path: '/user/organizations',
      open: cookie && hasFeature(status, 'org-console'),
      element: (
        <OrganizationsPage
          session={session}
          events={events}
          organizations={issuerOrganizations}
          activeOrgKey={ACTIVE_ORG_KEY}
        />
      ),
      token: 'org-console',
    },
    {
      path: '/org-console',
      open: hasFeature(status, 'org-console'),
      element: cookie ? (
        <OrgConsolePage
          session={session}
          events={events}
          activeOrgKey={ACTIVE_ORG_KEY}
          organizations={issuerOrganizations}
          org={account.activeOrgUuid}
          admin={globalAdmin}
          places={placesKey}
        />
      ) : (
        <OrgConsolePage
          session={session}
          activeOrgKey={ACTIVE_ORG_KEY}
          organizations={organizationsAdapter}
          org={account.activeOrgUuid}
          admin={globalAdmin}
        />
      ),
      token: 'org-console',
    },
    {
      path: '/user/integrations',
      open: cookie && hasFeature(status, 'integrations'),
      element: (
        <IntegrationsPage integrations={issuerIntegrations} stepUp={stepUp} user={account.user} />
      ),
      token: 'integrations',
    },
    {
      path: '/notifications',
      open: cookie && hasFeature(status, 'inbox') && Boolean(notifications),
      element: notifications ? <InboxPage notifications={notifications} /> : null,
      token: 'inbox',
    },
  ]);
};

const identityAdminRoutes = ({ cookie, globalAdmin, user }) =>
  IDENTITY_ADMIN_PAGES.map(page => (
    <Route
      key={`/admin/${page}`}
      path={`/admin/${page}`}
      element={gated(
        cookie,
        <IdentityAdminRoute globalAdmin={globalAdmin} user={user} page={page} />,
        titleOf('/admin'),
        'cookie'
      )}
    />
  ));

const sharedAdminRoutes = ({ cookie, globalAdmin, user }) =>
  cookie
    ? null
    : ['config', 'system'].map(page => (
        <Route
          key={`/admin/${page}`}
          path={`/admin/${page}`}
          element={<AdminRoute globalAdmin={globalAdmin} user={user} page={page} />}
        />
      ));

const homeElementFor = ({
  status,
  cookie,
  fleet,
  account,
  collections,
  context,
  theme,
  globalAdmin,
}) => {
  if (cookie) {
    if (!account.user) {
      return <Navigate to={returnTo.signInTo('/')} replace />;
    }
    return issuerProfile({ account, status, globalAdmin });
  }
  if (fleet) {
    return <FleetPage context={context} theme={theme} />;
  }
  return (
    <HomePage
      collections={collections}
      context={context}
      actions={hasFeature(status, 'discover') ? <DiscoverLink /> : null}
    />
  );
};

/**
 * Every route the app serves: the fleet page at `/` and the VM page at
 * `/vm/:instance` while the host advertises `fleet`, else the home page
 * and the collection routes from the registry in the host's order (the
 * issuer's profile at `/` on a `cookie` host, an anonymous visitor sent
 * to sign in with `/` as the return path), the setup page at `/setup` while the host
 * advertises `setup`, every other route sent there until setup is complete
 * and the page drawing its complete state after, each feature route gated by
 * its feature token or by the host's first `auth` token, and the identity
 * contract's five groups behind the `cookie` token and their feature
 * tokens, a route the host lacks rendering `NotAvailableStub` instead; the
 * shared admin pages at `/admin/config` and `/admin/system` are not
 * mounted on a `cookie` host, whose sidebar reaches the issuer's own
 * configuration page as a top-level navigation; on a `cookie` host
 * `/error` and every unknown route draw the identity contract's ErrorPage,
 * every other host sending an unknown route home.
 */
const AppRoutes = ({
  account,
  collections,
  context,
  theme,
  setupComplete,
  globalAdmin,
  afterSignIn,
  notifications = null,
  ticketUrl = '',
}) => {
  const status = useStatus();
  const backend = authMethod(status) === 'backend';
  const cookie = authMethod(status) === 'cookie';
  const fleet = hasFeatureStrict(status, 'fleet');
  const { activeOrgUuid, organizations, oidc, issuerUrl } = account;
  const setupRoute = hasFeature(status, 'setup') ? (
    <Route path="/setup" element={<SetupPage setup={setupApi} />} />
  ) : null;

  if (hasFeature(status, 'setup') && !setupComplete) {
    return (
      <Routes>
        {setupRoute}
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  const homeElement = homeElementFor({
    status,
    cookie,
    fleet,
    account,
    collections,
    context,
    theme,
    globalAdmin,
  });

  return (
    <Routes>
      {setupRoute}
      <Route path="/" element={homeElement} />
      <Route
        path="/vm/:instance"
        element={
          fleet ? (
            <VmRoute theme={theme} user={account.user} />
          ) : (
            <Stub titleKey={titleOf('/vm/:instance')} token="fleet" />
          )
        }
      />
      <Route path="/about" element={<AboutRoute theme={theme} oidc={oidc} />} />
      <Route path="/search" element={<SearchPage context={context} />} />
      <Route
        path="/organizations/discover"
        element={
          hasFeature(status, 'discover') ? (
            <DiscoveryPage
              session={session}
              returnTo={returnTo}
              organizations={organizationsAdapter}
              orgMark={<BrandLogo theme={theme} className="logo-lg icon-with-margin" />}
              joinIntentKey={JOIN_INTENT_KEY}
            />
          ) : (
            <Stub titleKey={titleOf('/organizations/discover')} token="discover" />
          )
        }
      />
      <Route
        path="/login"
        element={
          backend || cookie ? (
            <LoginPage
              session={session}
              returnTo={returnTo}
              auth={authAdapter}
              appName={status.brand.name}
            />
          ) : (
            <Stub titleKey={titleOf('/login')} token="backend" />
          )
        }
      />
      <Route
        path="/auth/callback"
        element={
          backend ? (
            <CallbackPage complete={session.complete} onDone={afterSignIn} />
          ) : (
            <Stub titleKey={titleOf('/auth/callback')} token="backend" />
          )
        }
      />
      <Route
        path="/register"
        element={
          backend && hasFeature(status, 'local-accounts') ? (
            <RegisterPage session={session} returnTo={returnTo} auth={authAdapter} />
          ) : (
            <Stub titleKey={titleOf('/register')} token="local-accounts" />
          )
        }
      />
      <Route
        path="/invite/:token"
        element={
          backend ? (
            <InvitePage
              session={session}
              returnTo={returnTo}
              auth={authAdapter}
              activeOrgKey={ACTIVE_ORG_KEY}
            />
          ) : (
            <Stub titleKey={titleOf('/invite/:token')} token="backend" />
          )
        }
      />
      {signInRoutes({ status, cookie })}
      {onboardingRoutes({ status, cookie })}
      {interstitialRoutes({ status, cookie })}
      <Route
        path="/profile"
        element={
          backend ? (
            <ProfilePage
              session={session}
              events={events}
              returnTo={returnTo}
              account={accountAdapter}
              activeOrgUuid={activeOrgUuid}
              localAccounts={hasFeature(status, 'local-accounts')}
              issuerUrl={issuerUrl}
              admin={globalAdmin}
            />
          ) : (
            gated(
              cookie,
              issuerProfile({ account, status, globalAdmin }),
              titleOf('/profile'),
              'backend'
            )
          )
        }
      />
      {signedInRoutes({ status, cookie, account, globalAdmin, notifications })}
      <Route
        path="/admin"
        element={
          cookie ? (
            <IdentityAdminRoute globalAdmin={globalAdmin} user={account.user} page="dashboard" />
          ) : (
            <AdminRoute globalAdmin={globalAdmin} user={account.user} />
          )
        }
      />
      {identityAdminRoutes({ cookie, globalAdmin, user: account.user })}
      {sharedAdminRoutes({ cookie, globalAdmin, user: account.user })}
      {collections.flatMap(collection =>
        collectionRoutes({ collection, collections, organizations, context })
      )}
      {cookie ? (
        <Route
          path="/error"
          element={<ErrorPage theme={theme} ticketUrl={ticketUrl} admin={globalAdmin} />}
        />
      ) : null}
      <Route
        path="*"
        element={
          cookie ? (
            <ErrorPage theme={theme} ticketUrl={ticketUrl} admin={globalAdmin} notFound />
          ) : (
            <Navigate to="/" />
          )
        }
      />
    </Routes>
  );
};

AppRoutes.propTypes = {
  account: sessionStateShape.isRequired,
  collections: PropTypes.arrayOf(collectionShape).isRequired,
  context: pageContextShape.isRequired,
  theme: PropTypes.string.isRequired,
  setupComplete: PropTypes.bool.isRequired,
  globalAdmin: PropTypes.bool.isRequired,
  afterSignIn: PropTypes.func.isRequired,
  notifications: notificationsAdapterShape,
  ticketUrl: PropTypes.string,
};

export default AppRoutes;
