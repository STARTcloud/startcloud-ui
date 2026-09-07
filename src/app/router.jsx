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
  TfaEnrolChoiceStep,
  TotpEnrolPage,
} from '../features/onboarding';
import {
  DiscoveryPage,
  OrgConsolePage,
  OrganizationsPage,
  approveRequest,
  createJoinRequest,
  denyRequest,
  discoverOrganizations,
  getOrganization,
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
  userOrganizations,
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
import { FleetPage, VmPage } from '../features/vdi';
import { sessionStateShape } from '../hooks/useSession';
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

const adminAdapterFor = method => {
  if (method === 'cookie') {
    return { updateStatus };
  }
  return {
    ...(method === 'backend' ? backendAdminMembers : {}),
    config: adminConfig,
    updateStatus,
  };
};

const firstAdminPage = admin => (admin.organizationsWithUsers ? 'organizations' : 'config');

/**
 * Every mounted feature's `sidebar(status, account)` answer, concatenated
 * in the order the column draws them: the profile feature's Account
 * group, the identity feature's operator group while the host's first
 * `auth` token is `cookie`, and the shared admin feature's entries over
 * the admin adapter the host gets; empty means no column.
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
    ...adminSidebar(status, account, adminAdapterFor(method)),
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

const AdminRoute = ({ globalAdmin, page = '' }) => {
  const status = useStatus();
  const admin = adminAdapterFor(authMethod(status));
  if (!hasFeature(status, 'admin')) {
    return <Stub titleKey="admin.pageTitle" token="admin" />;
  }
  return (
    <AdminPage
      session={session}
      returnTo={returnTo}
      allowed={globalAdmin}
      admin={admin}
      activeOrgKey={ACTIVE_ORG_KEY}
      updateCommand={UPDATE_COMMAND(status.role)}
      page={page || firstAdminPage(admin)}
    />
  );
};

AdminRoute.propTypes = {
  globalAdmin: PropTypes.bool.isRequired,
  page: PropTypes.string,
};

const IdentityAdminRoute = ({ globalAdmin, user, page }) => {
  const status = useStatus();
  if (!hasFeature(status, 'admin')) {
    return <Stub titleKey="admin.pageTitle" token="admin" />;
  }
  if (page === 'terms' && !hasFeature(status, 'policies')) {
    return <Stub titleKey="admin.terms.title" token="policies" />;
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
  if (collection.hasVersions && collection.hasProviders) {
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
  rows.map(({ path, open, element, titleKey, token }) => (
    <Route key={path} path={path} element={gated(open, element, titleKey, token)} />
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
      titleKey: 'auth:login.magic.title',
      token: 'cookie',
    },
    {
      path: '/authenticator',
      open: tfa,
      element: <TfaCodePage returnTo={returnTo} />,
      titleKey: 'auth:tfa.title',
      token: 'tfa',
    },
    {
      path: '/authenticator-method',
      open: tfa,
      element: <TfaMethodPage returnTo={returnTo} />,
      titleKey: 'auth:tfa.choose.title',
      token: 'tfa',
    },
    {
      path: '/passwordRecovery',
      open: local,
      element: <PasswordRecoveryPage {...pages} />,
      titleKey: 'auth:recovery.title',
      token: 'local-accounts',
    },
    {
      path: '/passwordReset',
      open: local,
      element: <PasswordResetPage {...pages} />,
      titleKey: 'auth:reset.title',
      token: 'local-accounts',
    },
    {
      path: '/registration',
      open: local,
      element: <RegisterPage {...pages} auth={authAdapter} />,
      titleKey: 'auth:register.pageTitle',
      token: 'local-accounts',
    },
    {
      path: '/registration/verify',
      open: local,
      element: <VerifyLinkPage returnTo={returnTo} />,
      titleKey: 'auth:register.pageTitle',
      token: 'local-accounts',
    },
  ]);
};

const onboardingRoutes = ({ status, cookie }) => {
  const onboarding = cookie && hasFeature(status, 'onboarding');
  const tfa = cookie && hasFeature(status, 'tfa');
  const policies = cookie && hasFeature(status, 'policies');
  const step = (path, open, Element, titleKey, token) => ({
    path,
    open,
    element: <Element returnTo={returnTo} />,
    titleKey,
    token,
  });
  return gatedRoutes([
    step(
      '/complete-onboarding',
      onboarding,
      OnboardingHub,
      'auth:onboarding.password',
      'onboarding'
    ),
    step(
      '/complete-onboarding/name',
      onboarding,
      NameStep,
      'auth:onboarding.name.title',
      'onboarding'
    ),
    step(
      '/complete-onboarding/phone-setup',
      onboarding,
      PhoneStep,
      'auth:onboarding.phone.title',
      'onboarding'
    ),
    step(
      '/complete-onboarding/email-verification',
      onboarding,
      EmailCodeStep,
      'auth:onboarding.email.title',
      'onboarding'
    ),
    step(
      '/complete-onboarding/choose-2fa-method',
      onboarding && tfa,
      TfaEnrolChoiceStep,
      'auth:onboarding.tfa.title',
      'tfa'
    ),
    step('/qrcode', tfa, TotpEnrolPage, 'auth:onboarding.qr.title', 'tfa'),
    step(
      '/complete-onboarding/backup-codes',
      onboarding,
      BackupCodesPage,
      'auth:onboarding.codes.title',
      'onboarding'
    ),
    step(
      '/complete-onboarding/account-type',
      onboarding && hasFeature(status, 'org-console'),
      AccountTypeStep,
      'auth:onboarding.account.title',
      'org-console'
    ),
    step(
      '/complete-onboarding/team-name',
      onboarding,
      TeamNameStep,
      'auth:onboarding.team.title',
      'onboarding'
    ),
    step('/oauth2/accept-terms', policies, TermsPage, 'auth:terms.pageTitle', 'policies'),
    step('/provider-registration/tos', policies, TermsPage, 'auth:terms.pageTitle', 'policies'),
    {
      path: '/public/policies/:name',
      open: hasFeature(status, 'policies'),
      element: <PolicyPage />,
      titleKey: 'auth:policy.pageTitle',
      token: 'policies',
    },
  ]);
};

const interstitialRoutes = ({ status, cookie }) => {
  const open = hasFeature(status, 'interstitials');
  const signedIn = cookie && open;
  const row = (path, gate, element, titleKey) => ({
    path,
    open: gate,
    element,
    titleKey,
    token: 'interstitials',
  });
  return gatedRoutes([
    row(
      '/oauth2/consent',
      signedIn,
      <ConsentPage session={session} returnTo={returnTo} />,
      'auth:consent.title'
    ),
    row('/activate', open, <DeviceActivatePage />, 'auth:device.title'),
    row('/activated', open, <DeviceActivatedPage />, 'auth:device.connected'),
    row('/ciba/approve', signedIn, <CibaApprovePage />, 'auth:ciba.title'),
    row(
      '/connect/logout/confirm',
      signedIn,
      <LogoutConfirmPage returnTo={returnTo} />,
      'auth:logout.title'
    ),
    row(
      '/connect/logout/frontchannel',
      open,
      <FrontChannelLogoutPage returnTo={returnTo} />,
      'auth:logout.signingOut'
    ),
    row('/oauth2/code', open, <CodeDisplayPage />, 'auth:code.title'),
    row('/continue', open, <DesktopContinuePage />, 'auth:desktop.title'),
    row(
      '/link-account-consent',
      signedIn,
      <LinkAccountPage returnTo={returnTo} />,
      'auth:link.title'
    ),
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
    {
      path: '/user/profile',
      open: cookie,
      element: profile,
      titleKey: 'profile.pageTitle',
      token: 'cookie',
    },
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
      titleKey: 'organizations.title',
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
      titleKey: 'orgConsole.pageTitle',
      token: 'org-console',
    },
    {
      path: '/user/integrations',
      open: cookie && hasFeature(status, 'integrations'),
      element: (
        <IntegrationsPage integrations={issuerIntegrations} stepUp={stepUp} user={account.user} />
      ),
      titleKey: 'integrations.title',
      token: 'integrations',
    },
    {
      path: '/notifications',
      open: cookie && hasFeature(status, 'inbox') && Boolean(notifications),
      element: notifications ? <InboxPage notifications={notifications} /> : null,
      titleKey: 'inbox.title',
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
        'admin.pageTitle',
        'cookie'
      )}
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
 * to sign in with `/` as the return path), the setup gate while the host
 * advertises `setup` and setup is incomplete, each feature route gated by
 * its feature token or by the host's first `auth` token, and the identity
 * contract's five groups behind the `cookie` token and their feature
 * tokens, a route the host lacks rendering `NotAvailableStub` instead; on
 * a `cookie` host `/error` and every unknown route draw the identity
 * contract's ErrorPage, every other host sending an unknown route home.
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
    <Route
      path="/setup"
      element={setupComplete ? <Navigate to="/register" replace /> : <SetupPage setup={setupApi} />}
    />
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
            <Stub titleKey="vdi.vm.title" token="fleet" />
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
            <Stub titleKey="discovery.title" token="discover" />
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
            <Stub titleKey="auth:login.pageTitle" token="backend" />
          )
        }
      />
      <Route
        path="/auth/callback"
        element={
          backend ? (
            <CallbackPage complete={session.complete} onDone={afterSignIn} />
          ) : (
            <Stub titleKey="auth:login.pageTitle" token="backend" />
          )
        }
      />
      <Route
        path="/register"
        element={
          backend && hasFeature(status, 'local-accounts') ? (
            <RegisterPage session={session} returnTo={returnTo} auth={authAdapter} />
          ) : (
            <Stub titleKey="auth:register.pageTitle" token="local-accounts" />
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
            <Stub titleKey="inviteAccept.title" token="backend" />
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
              'profile.pageTitle',
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
            <AdminRoute globalAdmin={globalAdmin} />
          )
        }
      />
      {identityAdminRoutes({ cookie, globalAdmin, user: account.user })}
      <Route
        path="/admin/config"
        element={<AdminRoute globalAdmin={globalAdmin} page="config" />}
      />
      <Route
        path="/admin/system"
        element={<AdminRoute globalAdmin={globalAdmin} page="system" />}
      />
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
