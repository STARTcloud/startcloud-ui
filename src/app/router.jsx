import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';

import BrandLogo from '../components/common/BrandLogo';
import NotAvailableStub from '../components/common/NotAvailableStub';
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
  storage,
  suspendUser,
  updateStatus,
} from '../features/admin';
import {
  CallbackPage,
  InvitePage,
  LoginPage,
  RegisterPage,
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
import {
  DiscoveryPage,
  OrgConsolePage,
  approveRequest,
  createJoinRequest,
  denyRequest,
  discoverOrganizations,
  getOrganization,
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
import {
  ProfilePage,
  cancelRequest,
  changeEmail,
  changeName,
  changePassword,
  leaveOrganization,
  myRequests,
  removeAccount,
  serviceAccounts,
  setPrimaryOrganization,
} from '../features/profile';
import { SetupPage, setupApi } from '../features/setup';
import { sessionStateShape } from '../hooks/useSession';
import { events, returnTo, session } from '../lib/runtime';
import { authMethod, hasFeature } from '../utils/capabilities';
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

const adminAdapter = {
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
  config: adminConfig,
  storage,
  updateStatus,
};

const Stub = ({ titleKey, token }) => {
  const { t } = useTranslation();
  return <NotAvailableStub title={t(titleKey)} tokenLabel={token} />;
};

Stub.propTypes = {
  titleKey: PropTypes.string.isRequired,
  token: PropTypes.string.isRequired,
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

/**
 * Every route the app serves: the collection routes from the registry in
 * the host's order, the setup gate while the host advertises `setup` and
 * setup is incomplete, and each feature route gated by its feature token or
 * by the host's first `auth` token, a route the host lacks rendering
 * `NotAvailableStub` instead.
 */
const AppRoutes = ({
  account,
  collections,
  context,
  theme,
  setupComplete,
  globalAdmin,
  afterSignIn,
}) => {
  const status = useStatus();
  const backend = authMethod(status) === 'backend';
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

  const homeElement = (
    <HomePage
      collections={collections}
      context={context}
      actions={hasFeature(status, 'discover') ? <DiscoverLink /> : null}
    />
  );

  return (
    <Routes>
      {setupRoute}
      <Route path="/" element={homeElement} />
      <Route path="/about" element={<AboutRoute theme={theme} oidc={oidc} />} />
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
          backend ? (
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
            />
          ) : (
            <Stub titleKey="profile.pageTitle" token="backend" />
          )
        }
      />
      <Route
        path="/admin"
        element={
          hasFeature(status, 'admin') ? (
            <AdminPage
              session={session}
              returnTo={returnTo}
              allowed={globalAdmin}
              admin={adminAdapter}
              activeOrgKey={ACTIVE_ORG_KEY}
              updateCommand={UPDATE_COMMAND}
            />
          ) : (
            <Stub titleKey="admin.pageTitle" token="admin" />
          )
        }
      />
      <Route
        path="/org-console"
        element={
          hasFeature(status, 'org-console') ? (
            <OrgConsolePage
              session={session}
              activeOrgKey={ACTIVE_ORG_KEY}
              organizations={organizationsAdapter}
              org={activeOrgUuid}
              admin={globalAdmin}
            />
          ) : (
            <Stub titleKey="orgConsole.pageTitle" token="org-console" />
          )
        }
      />
      {collections.flatMap(collection =>
        collectionRoutes({ collection, collections, organizations, context })
      )}
      <Route path="*" element={<Navigate to="/" />} />
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
};

export default AppRoutes;
