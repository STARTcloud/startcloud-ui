import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes, matchPath, useParams } from 'react-router-dom';

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
  organizationBodyOf,
  organizationRowOf,
  pageOf,
  resumeUser,
  sidebar as adminSidebar,
  storage,
  suspendUser,
  updateStatus,
  usersOf,
} from '../features/admin';
import { ApplicationsPage, issuerApplications } from '../features/applications';
import {
  BootstrapLoginPage,
  CallbackPage,
  InvitePage,
  LoginPage,
  MagicLinkPage,
  OrgInvitePage,
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
  validateInvitation,
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
  sidebar as catalogSidebar,
} from '../features/catalog';
import { ErrorPage } from '../features/errors';
import {
  IDENTITY_ADMIN_PAGES,
  IdentityAdminPage,
  issuerOrganizations as issuerAdminOrganizations,
  issuerUsers,
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
  ORG_CONSOLE_SEGMENTS,
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
  patchProfile,
  placesKey,
  removeAccount,
  resendVerification,
  serviceAccounts,
  setPrimaryOrganization,
  sidebar as profileSidebar,
  stepUp,
  verifyMail,
} from '../features/profile';
import { SearchPage } from '../features/search';
import { SetupPage, setupApi } from '../features/setup';
import { UserTermsPage, issuerTerms } from '../features/terms';
import { TfaCodePage, TfaMethodPage } from '../features/tfa';
import { FleetPage, VmPage, sidebar as vdiSidebar } from '../features/vdi';
import { configNamesOf } from '../hooks/useConfigTree';
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

const backendProfileOf = (user, oidc) =>
  user ? { ...user, has_local_auth: !oidc, email_verified: Boolean(user.verified) } : null;

const ADDRESS_CLAIMS = {
  street_address: 'line1',
  locality: 'city',
  region: 'state',
  postal_code: 'postal_code',
  country: 'country',
  formatted: 'formatted',
};

const addressOfClaims = address =>
  address && typeof address === 'object'
    ? Object.fromEntries(
        Object.entries(ADDRESS_CLAIMS)
          .filter(([claim]) => typeof address[claim] === 'string')
          .map(([claim, field]) => [field, address[claim]])
      )
    : null;

/**
 * The identity provider's record in the profile page's field names, from
 * the standard claims of OpenID Connect Core 1.0 §5.1 the host's claims
 * route answers: the names, website, gender and birthdate as they are,
 * `phone_number` as the masked mobile, `address` mapped from the §5.1.1
 * members to the address block's, `zoneinfo` and `locale` as the
 * preferences' time zone and language.
 *
 * @param {Object|null} claims - The claims the session answered
 * @returns {Object} The record fields the claims carry
 */
const profileOfClaims = claims => {
  if (!claims) {
    return {};
  }
  const address = addressOfClaims(claims.address);
  const phone = claims.phone_number
    ? { masked: claims.phone_number, verified: Boolean(claims.phone_number_verified) }
    : null;
  return {
    ...(claims.name ? { name: claims.name } : {}),
    ...(claims.email ? { email: claims.email } : {}),
    given_name: claims.given_name || '',
    family_name: claims.family_name || '',
    middle_name: claims.middle_name || '',
    website: claims.website || '',
    gender: claims.gender || '',
    birthdate: claims.birthdate || '',
    ...(phone ? { mobile_number: phone } : {}),
    ...(address ? { address } : {}),
    preferences: {
      ...(claims.zoneinfo ? { timezone: claims.zoneinfo } : {}),
      ...(claims.locale ? { language: claims.locale } : {}),
    },
  };
};

const backendProfile = oidc => async () => {
  const state = await session.reload();
  const user = backendProfileOf(state?.user || null, oidc);
  if (!user || !oidc) {
    return user;
  }
  const claims = await session.claims();
  return { ...user, ...profileOfClaims(claims) };
};

const ADDRESS_MEMBERS = ['line1', 'city', 'state', 'postal_code', 'country', 'formatted'];

const addressBody = record =>
  Object.fromEntries(ADDRESS_MEMBERS.map(member => [member, record?.[member] || null]));

const localDetails = userId => async body => {
  const { name, ...members } = body;
  if (name !== undefined) {
    await changeName(userId, name || '');
  }
  if (Object.keys(members).length > 0) {
    await patchProfile(members);
  }
};

/**
 * The writes of a local account's own record on a `backend` host, in the
 * identity provider's member names: `details` routes the display name to
 * the change-name call and every other member to `PATCH /api/user`, the
 * JSON Merge Patch over the host's SCIM core attributes, `address` writes
 * the address block's six stored members through the same patch, and
 * `phone` is the plain `set` of the number, the host verifying no code.
 *
 * @param {number} userId - The stored user's id
 * @returns {Object} The `details`, `address` and `phone` members
 */
const localRecordMembers = userId => ({
  details: localDetails(userId),
  address: record => patchProfile({ address: addressBody(record) }),
  phone: { set: number => patchProfile({ mobile_number: number || null }) },
});

const localAccountMembers = userId => ({
  password: body => changePassword(userId, body.password),
  email: { request: newEmail => changeEmail(userId, newEmail) },
  deletion: () => removeAccount(userId),
});

/**
 * The profile page's `account` adapter of a `backend` host, in the
 * identity provider's member names: the record from the session's own
 * reload with `has_local_auth` (a local session) and `email_verified`
 * (the stored `verified`) beside it; for an identity provider's session
 * the record is `readOnly` (RFC 7643 §2.2), merged with the provider's
 * standard claims through the session's memoized `claims()`, and
 * `manageUrl` is the provider's profile page, so the page draws the same
 * sections read-only with the Manage at identity provider link; for a
 * local account the record is `readWrite`, the name parts and the display
 * name through `details`, the address and the mobile number through
 * `address` and `phone.set`, the password, email and deletion members
 * while the host advertises `local-accounts`; on both the verification link and its
 * resend under `verification`, the memberships and join requests under
 * `organizations` (Make primary only for a local session) and the
 * service accounts under `serviceAccounts`.
 *
 * @param {Object} options - The session's side
 * @param {Object|null} options.user - The stored user
 * @param {boolean} options.oidc - Whether the session is the identity provider's
 * @param {string} options.issuerUrl - The identity provider behind the session, empty for a local one
 * @param {boolean} options.localAccounts - Whether the host advertises `local-accounts`
 * @returns {Object} The adapter
 */
const backendAccountFor = ({ user, oidc, issuerUrl, localAccounts }) => {
  const userId = user?.id;
  return {
    profile: backendProfile(oidc),
    mutability: oidc ? 'readOnly' : 'readWrite',
    ...(oidc && issuerUrl ? { manageUrl: `${issuerUrl}/user/profile` } : {}),
    ...(oidc ? {} : localRecordMembers(userId)),
    ...(localAccounts && !oidc ? localAccountMembers(userId) : {}),
    verification: { verify: verifyMail, resend: resendVerification },
    organizations: {
      list: userOrganizations,
      leave: leaveOrganization,
      ...(oidc ? {} : { setPrimary: setPrimaryOrganization }),
      requests: myRequests,
      cancelRequest,
    },
    serviceAccounts,
  };
};

const profileAccountFor = ({ status, account }) => {
  if (authMethod(status) === 'cookie') {
    return issuerAccount;
  }
  return backendAccountFor({
    user: account.user,
    oidc: account.oidc,
    issuerUrl: account.issuerUrl,
    localAccounts: hasFeature(status, 'local-accounts'),
  });
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

const notFoundError = () =>
  Object.assign(new Error('Not found'), { status: 404, messageKey: 'errors.notFound' });

/**
 * The Users page's adapter of a `backend` host over the
 * organizations-with-users answer: the paged list and the single record
 * by id read from the same rows, a missing id failing as a 404 the way
 * the client's own not-found does; the suspend, resume and delete calls
 * by id.
 */
const backendUsers = {
  list: params => organizationsWithUsers().then(rows => pageOf(usersOf(rows), params)),
  get: async id => {
    const row = usersOf(await organizationsWithUsers()).find(
      user => String(user.id) === String(id)
    );
    if (!row) {
      throw notFoundError();
    }
    return row;
  },
  suspend: suspendUser,
  resume: resumeUser,
  remove: removeAccount,
};

const renameActiveOrganization = async (name, next) => {
  if (session.restore()?.user?.organization === name) {
    localStorage.setItem(ACTIVE_ORG_KEY, next);
    await session.refresh();
  }
};

/**
 * The All organizations page's adapter of a `backend` host: the
 * organizations-with-users rows each joined with its record, one `update`
 * carrying the record write, the access-mode write while the patch names
 * a door, and the active organization's rename stored under the app's key
 * with the session refreshed; the suspend, resume and delete calls by
 * name, the row's id.
 */
const backendOrganizations = {
  list: () =>
    organizationsWithUsers().then(rows =>
      Promise.all(
        rows.map(org => getOrganization(org.name).then(details => organizationRowOf(org, details)))
      )
    ),
  update: async (name, patch) => {
    await updateOrganization(name, organizationBodyOf(name, patch));
    const next = patch.name || name;
    if (patch.access_mode) {
      await setAccessMode(
        next,
        patch.access_mode,
        String(patch.default_role || 'member').toLowerCase()
      );
    }
    if (next !== name) {
      await renameActiveOrganization(name, next);
    }
  },
  remove: removeOrganization,
  suspend: suspendOrganization,
  resume: resumeOrganization,
};

const backendAdminMembers = {
  users: backendUsers,
  organizations: backendOrganizations,
  storage,
};

const issuerAdminAdapters = { users: issuerUsers, organizations: issuerAdminOrganizations };

const hasConfigFiles = status => Array.isArray(status?.config) && status.config.length > 0;

const adminAdapterFor = status => {
  const method = authMethod(status);
  return {
    ...(method === 'backend' ? backendAdminMembers : {}),
    ...(hasConfigFiles(status) ? { config: adminConfig } : {}),
    ...(method === 'cookie' ? {} : { updateStatus }),
  };
};

const ACCOUNT_PAGES = ['users', 'organizations'];

const PAGE_TITLES = {
  '/about': 'navbar.about',
  '/search': 'search.page.title',
  '/organizations/discover': 'discovery.title',
  '/login': 'auth:login.pageTitle',
  '/login/magic': 'auth:login.magic.title',
  '/login/bootstrap': 'auth:login.bootstrap.title',
  '/auth/callback': 'auth:login.pageTitle',
  '/register': 'auth:register.pageTitle',
  '/registration': 'auth:register.pageTitle',
  '/registration/verify': 'auth:register.pageTitle',
  '/invite/:token': 'inviteAccept.title',
  '/org/invite/:token?': 'auth:invite.title',
  '/profile': 'profile.pageTitle',
  '/user/profile/:section?': 'profile.pageTitle',
  '/user/organizations': 'organizations.title',
  '/user/applications': 'applications.title',
  '/user/terms': 'userTerms.title',
  '/user/integrations': 'integrations.title',
  '/org-console': 'orgConsole.pageTitle',
  '/org-console/:tab': 'orgConsole.pageTitle',
  '/notifications': 'inbox.title',
  '/admin': 'admin.pageTitle',
  '/admin/users/:id': 'admin.users.title',
  '/admin/terms': 'admin.terms.title',
  '/admin/email-templates': 'admin.emailTemplates.title',
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

const CRUMB_PARENTS = {
  '/org-console': {
    parent: '/user/organizations',
    name: ({ activeOrganization }) => activeOrganization?.name || '',
  },
  '/admin/users/:id': {
    parent: '/admin/users',
    name: ({ pageName, t }) => pageName || t('admin.users.placeholder'),
  },
};

/**
 * The sidebar row a page living at its own path descends from, for the
 * crumbs of the pages contract's Breadcrumb section: the row's path as
 * `parent` and `name`, a resolver called with `{ activeOrganization,
 * pageName, params, t }`, the page's own name resolved from what the
 * shell holds (`activeOrganization`, the organization console's name
 * being the active membership's), the name the page set through
 * `usePageName` (`pageName`, a user record's being its username, the
 * translated placeholder "User" standing in while the record has not
 * loaded), the route's own parameters (`params`) and the translator
 * (`t`); null for a route no row parents.
 *
 * @param {string} pathname - The current path
 * @returns {{ parent: string, name: Function }|null} The parent row and the name resolver
 */
export const routeCrumbParent = pathname => {
  for (const [path, entry] of Object.entries(CRUMB_PARENTS)) {
    const match = matchPath(path, pathname);
    if (match) {
      return { parent: entry.parent, name: held => entry.name({ ...held, params: match.params }) };
    }
  }
  return null;
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
 * in the order the column draws them: the catalog feature's Catalog group
 * while the host mounts a collection, for every visitor (handed the
 * session's account and the mounted collection definitions its Browse
 * tree walks, no status because it branches on nothing the host
 * advertises), the profile feature's Account
 * group (handed the integrations adapter its Integrations entry reads
 * once and the host's profile adapter its Profile children are built
 * from), the identity feature's operator group while the host's first
 * `auth` token is `cookie` (its Configuration row reaching the shared
 * configuration page in place of the shared admin feature's entries), the
 * vdi feature's Fleet group while the host advertises `fleet`, and on
 * every other host the shared admin feature's entries over the admin
 * adapter the host gets; empty means no column.
 *
 * @param {Object} options - The shell's side
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {Object} options.account - The session state from `useSession`
 * @param {Array<Object>} options.collections - The host's mounted collection definitions
 * @returns {Array} The sidebar groups `AppShell` takes as `sidebar`
 */
export const sidebarEntries = ({ status, account, collections }) => {
  const cookie = authMethod(status) === 'cookie';
  const admin = adminAdapterFor(status);
  return [
    ...catalogSidebar(account, collections),
    ...profileSidebar(status, account, issuerIntegrations, profileAccountFor({ status, account })),
    ...(cookie ? identitySidebar(status, account, admin) : []),
    ...vdiSidebar(status, account),
    ...(cookie ? [] : adminSidebar(status, account, admin)),
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

const AdminRoute = ({ globalAdmin, user = null, page = 'config' }) => {
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
        updateCommand={UPDATE_COMMAND(status.role)}
        page={page}
      />
    </GuardProvider>
  );
};

AdminRoute.propTypes = {
  globalAdmin: PropTypes.bool.isRequired,
  user: PropTypes.object,
  page: PropTypes.string,
};

const AdminHomeRoute = ({ globalAdmin, user = null }) => {
  const status = useStatus();
  const admin = adminAdapterFor(status);
  if (hasFeature(status, 'admin') && admin.organizations) {
    return <Navigate to="/admin/organizations" replace />;
  }
  return <AdminRoute globalAdmin={globalAdmin} user={user} />;
};

AdminHomeRoute.propTypes = {
  globalAdmin: PropTypes.bool.isRequired,
  user: PropTypes.object,
};

const ConfigRedirect = ({ globalAdmin, user = null }) => {
  const status = useStatus();
  const [first] = configNamesOf(status);
  if (!first) {
    return <AdminRoute globalAdmin={globalAdmin} user={user} page="config" />;
  }
  return <Navigate to={`/admin/config/${encodeURIComponent(first)}`} replace />;
};

ConfigRedirect.propTypes = {
  globalAdmin: PropTypes.bool.isRequired,
  user: PropTypes.object,
};

const IdentityAdminRoute = ({ globalAdmin, user, page }) => {
  const status = useStatus();
  const cookie = authMethod(status) === 'cookie';
  const admin = adminAdapterFor(status);
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
      adapters={
        cookie ? issuerAdminAdapters : { users: admin.users, organizations: admin.organizations }
      }
    />
  );
};

IdentityAdminRoute.propTypes = {
  globalAdmin: PropTypes.bool.isRequired,
  user: PropTypes.object,
  page: PropTypes.string.isRequired,
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
  const { org, name, version, provider, architecture } = useParams();
  return (
    <ProviderPage
      collection={collection}
      org={org}
      name={name}
      version={version}
      provider={provider}
      architecture={architecture || ''}
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
  if (collection.hasVersions && collection.leafIsFile) {
    routes.push(
      <Route
        key={`${base}/:name/:version/:provider/:architecture`}
        path={`${base}/:name/:version/:provider/:architecture`}
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

const signInRoutes = ({ status, cookie, account }) => {
  const tfa = cookie && hasFeature(status, 'tfa');
  const local = cookie && hasFeature(status, 'local-accounts');
  const pages = { account, returnTo };
  return gatedRoutes([
    {
      path: '/login/magic',
      open: cookie,
      element: <MagicLinkPage returnTo={returnTo} events={events} />,
      token: 'cookie',
    },
    {
      path: '/login/bootstrap',
      open: cookie,
      element: <BootstrapLoginPage returnTo={returnTo} events={events} />,
      token: 'cookie',
    },
    {
      path: '/authenticator',
      open: tfa,
      element: <TfaCodePage returnTo={returnTo} events={events} />,
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
      element: <RegisterPage session={session} {...pages} auth={authAdapter} />,
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
    row('/link-account-consent', signedIn, <LinkAccountPage returnTo={returnTo} events={events} />),
  ]);
};

const issuerProfile = ({ account, globalAdmin }) => (
  <ProfilePage
    session={session}
    events={events}
    returnTo={returnTo}
    account={issuerAccount}
    basePath="/user/profile"
    activeOrgUuid={account.activeOrgUuid}
    organizations={account.organizations}
    admin={globalAdmin}
    user={account.user}
    loaded={account.loaded}
  />
);

const BackendProfileRoute = ({ account, status, globalAdmin }) => {
  const { user, oidc, issuerUrl } = account;
  const localAccounts = hasFeature(status, 'local-accounts');
  const adapter = useMemo(
    () => backendAccountFor({ user, oidc, issuerUrl, localAccounts }),
    [user, oidc, issuerUrl, localAccounts]
  );
  return (
    <ProfilePage
      session={session}
      events={events}
      returnTo={returnTo}
      account={adapter}
      basePath="/profile"
      activeOrgUuid={account.activeOrgUuid}
      organizations={account.organizations}
      admin={globalAdmin}
      user={account.user}
      loaded={account.loaded}
    />
  );
};

BackendProfileRoute.propTypes = {
  account: sessionStateShape.isRequired,
  status: PropTypes.object.isRequired,
  globalAdmin: PropTypes.bool.isRequired,
};

const OrgConsoleRoute = ({ cookie, account, globalAdmin }) => {
  const { tab = '' } = useParams();
  const segment = ORG_CONSOLE_SEGMENTS.includes(tab) ? tab : '';
  if (cookie) {
    return (
      <OrgConsolePage
        session={session}
        events={events}
        activeOrgKey={ACTIVE_ORG_KEY}
        organizations={issuerOrganizations}
        org={account.activeOrgUuid}
        admin={globalAdmin}
        places={placesKey}
      />
    );
  }
  return (
    <OrgConsolePage
      session={session}
      activeOrgKey={ACTIVE_ORG_KEY}
      organizations={organizationsAdapter}
      org={account.activeOrgUuid}
      admin={globalAdmin}
      tab={segment}
    />
  );
};

OrgConsoleRoute.propTypes = {
  cookie: PropTypes.bool.isRequired,
  account: sessionStateShape.isRequired,
  globalAdmin: PropTypes.bool.isRequired,
};

const signedInRoutes = ({
  status,
  cookie,
  account,
  globalAdmin,
  notifications,
  theme,
  ticketUrl,
}) => {
  const profile = issuerProfile({ account, globalAdmin });
  const notFound = <ErrorPage theme={theme} ticketUrl={ticketUrl} admin={globalAdmin} notFound />;
  return gatedRoutes([
    { path: '/user/profile/:section?', open: cookie, element: profile, token: 'cookie' },
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
      element: <OrgConsoleRoute cookie={cookie} account={account} globalAdmin={globalAdmin} />,
      token: 'org-console',
    },
    {
      path: '/org-console/:tab',
      open: hasFeature(status, 'org-console'),
      element: <OrgConsoleRoute cookie={cookie} account={account} globalAdmin={globalAdmin} />,
      token: 'org-console',
    },
    {
      path: '/org/invite/:token?',
      open: cookie && hasFeature(status, 'invitations'),
      element: <OrgInvitePage returnTo={returnTo} />,
      token: 'invitations',
    },
    {
      path: '/user/applications',
      open: cookie,
      element: (
        <ApplicationsPage applications={issuerApplications} stepUp={stepUp} user={account.user} />
      ),
      token: 'cookie',
    },
    {
      path: '/user/terms',
      open: cookie && hasFeature(status, 'policies'),
      element: <UserTermsPage terms={issuerTerms} />,
      token: 'policies',
    },
    {
      path: '/user/integrations',
      open: cookie && hasFeature(status, 'integrations'),
      element: <IntegrationsPage integrations={issuerIntegrations} fallback={notFound} />,
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

const identityAdminRoutes = ({ cookie, accounts, globalAdmin, user }) =>
  [
    ...IDENTITY_ADMIN_PAGES.map(page => ({ path: `/admin/${page}`, page, list: page })),
    { path: '/admin/users/:id', page: 'user', list: 'users' },
  ].map(({ path, page, list }) => (
    <Route
      key={path}
      path={path}
      element={gated(
        cookie || (accounts && ACCOUNT_PAGES.includes(list)),
        <IdentityAdminRoute globalAdmin={globalAdmin} user={user} page={page} />,
        titleOf('/admin'),
        'cookie'
      )}
    />
  ));

const sharedAdminRoutes = ({ globalAdmin, user }) => [
  <Route
    key="/admin/config"
    path="/admin/config"
    element={<ConfigRedirect globalAdmin={globalAdmin} user={user} />}
  />,
  ...[
    { path: '/admin/config/:name', page: 'config' },
    { path: '/admin/system', page: 'system' },
  ].map(({ path, page }) => (
    <Route
      key={path}
      path={path}
      element={<AdminRoute globalAdmin={globalAdmin} user={user} page={page} />}
    />
  )),
];

const homeElementFor = ({ cookie, fleet, account, collections, context, theme, globalAdmin }) => {
  if (cookie) {
    if (!account.user) {
      return <Navigate to={returnTo.signInTo('/')} replace />;
    }
    return issuerProfile({ account, globalAdmin });
  }
  if (fleet) {
    return <FleetPage context={context} theme={theme} />;
  }
  return <HomePage collections={collections} context={context} />;
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
 * tokens, a route the host lacks rendering `NotAvailableStub` instead
 * (`/user/integrations` drawing the ErrorPage's 404 while the issuer's
 * answer carries no `services`); the
 * shared admin pages at `/admin/config/:name` and `/admin/system` on
 * every host, the Configuration page drawing the named file of
 * `status.config`, the bare `/admin/config` redirecting to the first
 * name's route and drawing the empty state while the list is empty, on a
 * `cookie` host behind
 * the identity feature's Configuration entry; the
 * sign-in, register and profile pages take the session state, whose
 * adopted session alone sends a signed-in person off a sign-in page or
 * draws the profile; on a `cookie` host
 * `/error` and every unknown route draw the identity contract's ErrorPage,
 * every other host sending an unknown route home; on a `backend` host the
 * identity feature's Users and All organizations pages answer
 * `/admin/users` and `/admin/organizations` over the host's own accounts
 * and the bare `/admin` redirects to the organizations; one account's
 * record page answers `/admin/users/:id` wherever the Users page does.
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
  const { organizations, oidc } = account;
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
      <Route
        path="/about"
        element={<AboutRoute theme={theme} oidc={oidc} clientId={account.clientId} />}
      />
      <Route path="/search" element={<SearchPage context={context} />} />
      <Route
        path="/organizations/discover"
        element={
          hasFeature(status, 'discover') ? (
            <DiscoveryPage
              session={session}
              returnTo={returnTo}
              organizations={cookie ? issuerOrganizations : organizationsAdapter}
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
              account={account}
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
            <RegisterPage
              session={session}
              account={account}
              returnTo={returnTo}
              auth={authAdapter}
            />
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
      {signInRoutes({ status, cookie, account })}
      {onboardingRoutes({ status, cookie })}
      {interstitialRoutes({ status, cookie })}
      {['/profile', '/profile/:section'].map(path => (
        <Route
          key={path}
          path={path}
          element={
            backend ? (
              <BackendProfileRoute account={account} status={status} globalAdmin={globalAdmin} />
            ) : (
              gated(cookie, issuerProfile({ account, globalAdmin }), titleOf('/profile'), 'backend')
            )
          }
        />
      ))}
      {signedInRoutes({
        status,
        cookie,
        account,
        globalAdmin,
        notifications,
        theme,
        ticketUrl,
      })}
      <Route
        path="/admin"
        element={
          cookie ? (
            <IdentityAdminRoute globalAdmin={globalAdmin} user={account.user} page="dashboard" />
          ) : (
            <AdminHomeRoute globalAdmin={globalAdmin} user={account.user} />
          )
        }
      />
      {identityAdminRoutes({ cookie, accounts: backend, globalAdmin, user: account.user })}
      {sharedAdminRoutes({ globalAdmin, user: account.user })}
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
