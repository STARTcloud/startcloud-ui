import PropTypes from 'prop-types';
import { Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes, matchPath, useParams } from 'react-router-dom';

import BrandLogo from '../components/common/BrandLogo';
import NotAvailableStub from '../components/common/NotAvailableStub';
import SignInPlacard from '../components/common/SignInPlacard';
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
  roleNames,
  setUserRoles,
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
import { ErrorPage, hasServerFault } from '../features/errors';
import {
  AgentSettings,
  DashboardPage,
  DevicesPage,
  HostPage,
  HostsPage,
  MachinePage,
  MachinesPage,
  ManagePage,
  NetworkingPage,
  StandaloneConsole,
  StandaloneRdpConsole,
  StoragePage,
  actionMenu as hostsActionMenu,
  footerPane as hostsFooterPane,
  isServerRole,
  sidebar as hostsSidebar,
} from '../features/hosts';
import {
  IDENTITY_ADMIN_PAGES,
  IdentityAdminPage,
  issuerOrganizations as issuerAdminOrganizations,
  issuerUsers,
  sidebar as identitySidebar,
} from '../features/identity';
import {
  HyperweaverServicePage,
  IntegrationsPage,
  issuerIntegrations,
} from '../features/integrations';
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
  issuerGuestAccount,
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
import { ServerSetup, SetupPage, ZoneRegister, setupApi } from '../features/setup';
import { UserTermsPage, issuerTerms } from '../features/terms';
import { TfaCodePage, TfaMethodPage } from '../features/tfa';
import { FleetPage, VmPage, sidebar as vdiSidebar } from '../features/vdi';
import { configNamesOf } from '../hooks/useConfigTree';
import { sessionStateShape } from '../hooks/useSession';
import { getOrganization, userOrganizations } from '../lib/organizations';
import { events, returnTo, session } from '../lib/runtime';
import { authMethod, hasFeature, hasFeatureStrict } from '../utils/capabilities';
import { gravatarProfile } from '../utils/gravatar';
import { guestOnly, isMember, routeNameOf } from '../utils/membership';
import { collectionPath } from '../utils/routes';

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

const apiKeyProfile = async () => (await session.reload())?.user || null;

const PREFERENCE_MEMBERS = ['language', 'mode', 'theme', 'motion', 'timezone'];

const apiKeyPreferences = patch => {
  const picked = Object.fromEntries(
    Object.entries(patch).filter(([member]) => PREFERENCE_MEMBERS.includes(member))
  );
  return Object.keys(picked).length > 0 ? session.savePreferences(picked) : Promise.resolve();
};

/**
 * The profile page's `account` adapter of an `apikey` host, the person
 * behind hyperweaver-agent's key: the record from the session's own
 * reload, the agent's `GET /api/user` in the identity provider's shape
 * under the key's profile; `readOnly` on every key, because the agent
 * serves no write of the record's details, with `manageUrl` the identity
 * provider's profile page while a federated login minted the key
 * (`issuerUrl`), so the page draws the details read-only with the
 * Manage at identity provider link, and no link on a tray or typed key,
 * whose record has no other home; on every key the Preferences card is
 * editable through `preferences`, because the theme, the mode, the
 * motion, the language and the time zone are this application's own
 * choices of the person (identity contract decision 168), the branding
 * contract's five members written through the session's
 * `PATCH /api/user/preferences` and kept by the agent; no password,
 * email, deletion, organizations or service accounts, the agent serving
 * none.
 *
 * @param {Object} options - The session's side
 * @param {string} options.issuerUrl - The identity provider behind the key, empty for a plain one
 * @returns {Object} The adapter
 */
const apiKeyAccountFor = ({ issuerUrl }) => ({
  profile: apiKeyProfile,
  mutability: 'readOnly',
  preferences: apiKeyPreferences,
  ...(issuerUrl ? { manageUrl: `${issuerUrl}/user/profile` } : {}),
});

const profileAccountFor = ({ status, account }) => {
  if (authMethod(status) === 'cookie') {
    return guestOnly(account.organizations) ? issuerGuestAccount : issuerAccount;
  }
  if (authMethod(status) === 'apikey') {
    return apiKeyAccountFor({ issuerUrl: account.issuerUrl });
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
 * the client's own not-found does; the role catalog from `GET /api/roles`
 * and the whole-set roles write through `PUT /api/users/{id}/roles`, so
 * the Roles dialog draws; the suspend, resume and delete calls by id.
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
  roles: roleNames,
  setRoles: setUserRoles,
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
  '/user/integrations/hyperweaver': 'integrations.hyperweaver.title',
  '/org-console': 'orgConsole.pageTitle',
  '/org-console/:tab': 'orgConsole.pageTitle',
  '/notifications': 'inbox.title',
  '/admin': 'admin.pageTitle',
  '/admin/users/:id': 'admin.users.title',
  '/admin/terms': 'admin.terms.title',
  '/admin/email-templates': 'admin.emailTemplates.title',
  '/setup': 'setup.title',
  '/setup/server': 'auth.serverSetup.serverSetupTitle',
  '/setup/zone': 'auth.zoneRegister.registerBtn',
  '/vm/:instance': 'vdi.vm.title',
  '/hosts/:id': 'hosts.host.title',
  '/hosts/:id/machines': 'hosts.machines.pageTitle',
  '/hosts/:id/machines/:name': 'hosts.machine.title',
  '/hosts/:id/machines/:name/settings': 'navbar.contextTabs.settings',
  '/hosts/:id/machines/:name/snapshots': 'navbar.contextTabs.snapshots',
  '/hosts/:id/machines/:name/provisioning': 'navbar.contextTabs.provisioning',
  '/hosts/:id/machines/:name/console/vnc': 'chrome.sidebarMenu.vncConsole',
  '/hosts/:id/machines/:name/console/rdp': 'console.rdpConsoleDisplay.vrdpLabel',
  '/hosts/:id/networking': 'host.networkingHeader.title',
  '/hosts/:id/manage': 'pages.hostManage.pageTitle',
  '/hosts/:id/devices': 'host.deviceHeader.title',
  '/hosts/:id/storage': 'host.storageHeader.title',
  '/hosts/:id/settings': 'navbar.contextTabs.agent',
  '/hosts/:id/settings/:name': 'navbar.contextTabs.agent',
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
 * equals or descends from, and the shell draws it as the one crumb when
 * no sidebar row matches the route.
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
 * in the order the column draws them, behind one gate: nothing at all
 * unless the host lists the `sidebar` feature token (a host listing no
 * `features` array draws the column, `hasFeature` answering true there),
 * so the badges, the crumbs and the header's brand slot all follow from
 * the empty list; below that gate the catalog feature's Browse group
 * while the host mounts a collection (handed the status, the session's
 * account and the mounted collection definitions its tree walks: the
 * group for every visitor while the host advertises `browse`, for a
 * `ROLE_ADMIN` account alone while it advertises `admin` instead, else
 * none), the hosts feature's Hosts group while the host advertises
 * `hosts`, above the Account group because what a UI backend is for
 * draws before the person's own account, the profile feature's Account
 * group (handed the integrations adapter its Integrations entry reads
 * once and the host's profile adapter its Profile children are built
 * from), the identity feature's operator group while the host's first
 * `auth` token is `cookie` (its Configuration row reaching the shared
 * configuration page in place of the shared admin feature's entries), the
 * vdi feature's Fleet group while the host advertises `fleet`, and on
 * every other host the shared admin feature's entries over the admin
 * adapter the host gets, in the order catalog, hosts, profile, identity,
 * vdi, admin; empty means no column.
 *
 * @param {Object} options - The shell's side
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {Object} options.account - The session state from `useSession`
 * @param {Array<Object>} options.collections - The host's mounted collection definitions
 * @returns {Array} The sidebar groups `AppShell` takes as `sidebar`
 */
export const sidebarEntries = ({ status, account, collections }) => {
  if (!hasFeature(status, 'sidebar')) {
    return [];
  }
  const cookie = authMethod(status) === 'cookie';
  const admin = adminAdapterFor(status);
  return [
    ...catalogSidebar(status, account, collections),
    ...hostsSidebar(status, account),
    ...profileSidebar(status, account, issuerIntegrations, profileAccountFor({ status, account })),
    ...(cookie ? identitySidebar(status, account, admin) : []),
    ...vdiSidebar(status, account),
    ...(cookie ? [] : adminSidebar(status, account, admin)),
  ];
};

/**
 * The first non-null `actionMenu(status, account)` answer of the mounted
 * features, the navbar contract's Foot exception: while one answers, the
 * header's account slot draws that menu and the user menu moves to the
 * sidebar's foot; today the hosts feature's Controls menu alone, drawn
 * here with the session's user under a `Suspense` around its lazy
 * component. Null means the account slot keeps the user menu.
 *
 * @param {Object} options - The shell's side
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {Object} options.account - The session state from `useSession`
 * @returns {import('react').ReactElement|null} The menu `App` hands the shell
 */
export const actionMenuFor = ({ status, account }) => {
  const Menu = [hostsActionMenu].map(menu => menu(status, account)).find(Boolean) || null;
  if (!Menu) {
    return null;
  }
  return (
    <Suspense fallback={null}>
      <Menu user={account.user} />
    </Suspense>
  );
};

/**
 * The first non-null `footerPane(status, account)` answer of the mounted
 * features, the pane of the navbar contract's Footer status section:
 * while one answers, the footer calls the hook it answered for the
 * pane's views, draws the grip in its center and the pane under its row
 * while the hook answers a view, and draws the row of every other host
 * while it answers none; today the hosts feature's tasks and shell
 * views alone. Null means the footer draws no pane.
 *
 * @param {Object} options - The shell's side
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {Object} options.account - The session state from `useSession`
 * @returns {Function|null} The views hook `App` hands the shell
 */
export const footerPaneFor = ({ status, account }) =>
  [hostsFooterPane].map(pane => pane(status, account)).find(Boolean) || null;

const Stub = ({ titleKey, token }) => {
  const { t } = useTranslation();
  return <NotAvailableStub title={t(titleKey)} tokenLabel={token} />;
};

Stub.propTypes = {
  titleKey: PropTypes.string.isRequired,
  token: PropTypes.string.isRequired,
};

/**
 * The page a hosts route draws for a visitor on a host that needs a
 * session, the sign-in placard under the route's own title with this
 * page as the return path: the page itself is not mounted, so no provider
 * of the hosts feature reads anything without a credential, the rule the
 * hosts sidebar, the Controls menu and the footer's pane keep.
 */
const SignInStub = ({ titleKey, signIn }) => {
  const { t } = useTranslation();
  return <SignInPlacard title={t(titleKey)} user={null} onSignIn={signIn} />;
};

SignInStub.propTypes = {
  titleKey: PropTypes.string.isRequired,
  signIn: PropTypes.func.isRequired,
};

const AdminRoute = ({ globalAdmin, user = null, page = 'config' }) => {
  const status = useStatus();
  const admin = useMemo(() => adminAdapterFor(status), [status]);
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
  if (hasFeature(status, 'admin') && configNamesOf(status).length > 0) {
    return <Navigate to="/admin/config" replace />;
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

const VmRoute = ({ mode, user }) => {
  const { instance } = useParams();
  return <VmPage instance={instance} mode={mode} user={user} />;
};

VmRoute.propTypes = {
  mode: PropTypes.string.isRequired,
  user: PropTypes.object,
};

const HostRoute = ({ context }) => {
  const { id } = useParams();
  return <HostPage id={id} context={context} />;
};

HostRoute.propTypes = {
  context: pageContextShape.isRequired,
};

const MachinesRoute = ({ context }) => {
  const { id } = useParams();
  return <MachinesPage id={id} context={context} />;
};

MachinesRoute.propTypes = {
  context: pageContextShape.isRequired,
};

const NetworkingRoute = ({ context }) => {
  const { id } = useParams();
  return <NetworkingPage id={id} context={context} />;
};

NetworkingRoute.propTypes = {
  context: pageContextShape.isRequired,
};

const ManageRoute = ({ context }) => {
  const { id } = useParams();
  return <ManagePage id={id} context={context} />;
};

ManageRoute.propTypes = {
  context: pageContextShape.isRequired,
};

const DevicesRoute = ({ context }) => {
  const { id } = useParams();
  return <DevicesPage id={id} context={context} />;
};

DevicesRoute.propTypes = {
  context: pageContextShape.isRequired,
};

const StorageRoute = ({ context }) => {
  const { id } = useParams();
  return <StoragePage id={id} context={context} />;
};

StorageRoute.propTypes = {
  context: pageContextShape.isRequired,
};

/**
 * The Agent settings route of a host and, with the `name` segment, one
 * configuration file of it: the page under the shell's one step-up
 * window, `GuardProvider` the way `AdminRoute` mounts it, because the
 * shared configuration engine runs the restart and every action through
 * `useGuard`.
 */
const AgentSettingsRoute = ({ context }) => {
  const { id, name = '' } = useParams();
  return (
    <GuardProvider stepUp={stepUp} hasPassword={Boolean(context.user?.has_local_auth)}>
      <AgentSettings id={id} name={name} context={context} />
    </GuardProvider>
  );
};

AgentSettingsRoute.propTypes = {
  context: pageContextShape.isRequired,
};

const MachineRoute = ({ context, organizations, page = 'overview' }) => {
  const { id, name } = useParams();
  return (
    <MachinePage id={id} name={name} context={context} organizations={organizations} page={page} />
  );
};

MachineRoute.propTypes = {
  context: pageContextShape.isRequired,
  organizations: PropTypes.array.isRequired,
  page: PropTypes.string,
};

const ConsoleRoute = ({ kind }) => {
  const { id, name } = useParams();
  return kind === 'rdp' ? (
    <StandaloneRdpConsole id={id} name={name} />
  ) : (
    <StandaloneConsole id={id} name={name} />
  );
};

ConsoleRoute.propTypes = {
  kind: PropTypes.oneOf(['vnc', 'rdp']).isRequired,
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
  const root = collectionPath(collection, '');
  const routes = [
    <Route
      key={root}
      path={root}
      element={<CollectionPage collection={collection} org="" member={false} context={context} />}
    />,
  ];
  if (collection.segment) {
    const orgCollectionElement = (
      <OrgCollectionRoute collection={collection} organizations={organizations} context={context} />
    );
    routes.push(<Route key={base} path={base} element={orgCollectionElement} />);
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
    account={guestOnly(account.organizations) ? issuerGuestAccount : issuerAccount}
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

const ApiKeyProfileRoute = ({ account, globalAdmin }) => {
  const { issuerUrl } = account;
  const adapter = useMemo(() => apiKeyAccountFor({ issuerUrl }), [issuerUrl]);
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

ApiKeyProfileRoute.propTypes = {
  account: sessionStateShape.isRequired,
  globalAdmin: PropTypes.bool.isRequired,
};

const localProfileFor = ({ backend, apiKey, account, status, globalAdmin }) => {
  if (backend) {
    return <BackendProfileRoute account={account} status={status} globalAdmin={globalAdmin} />;
  }
  if (apiKey) {
    return <ApiKeyProfileRoute account={account} globalAdmin={globalAdmin} />;
  }
  return null;
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
      org={routeNameOf(account.organizations, account.activeOrgUuid)}
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

const signedInRoutes = ({ status, cookie, account, globalAdmin, notifications, ticketUrl }) => {
  const profile = issuerProfile({ account, globalAdmin });
  const notFound = <ErrorPage ticketUrl={ticketUrl} admin={globalAdmin} notFound />;
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
      path: '/user/integrations/hyperweaver',
      open: cookie && hasFeature(status, 'integrations'),
      element: <HyperweaverServicePage integrations={issuerIntegrations} fallback={notFound} />,
      token: 'integrations',
    },
    {
      path: '/notifications',
      open: hasFeature(status, 'inbox') && Boolean(notifications),
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

/**
 * The hosts feature's fourteen routes, the host page at `/hosts/:id`, the
 * machines of a host at `/hosts/:id/machines`, the machine page at
 * `/hosts/:id/machines/:name`, its settings at
 * `/hosts/:id/machines/:name/settings`, its snapshots at
 * `/hosts/:id/machines/:name/snapshots`, its provisioning at
 * `/hosts/:id/machines/:name/provisioning`, its full-window VNC console
 * at `/hosts/:id/machines/:name/console/vnc` and its full-window RDP
 * console at `/hosts/:id/machines/:name/console/rdp`, the networking of
 * a host at `/hosts/:id/networking`, its Manage page at
 * `/hosts/:id/manage`, its devices at `/hosts/:id/devices`, its
 * storage at `/hosts/:id/storage`, its agent's settings at
 * `/hosts/:id/settings` and one configuration file of the agent at
 * `/hosts/:id/settings/:name`, the hosts feature's mount of the shared
 * configuration engine, each open while the host advertises
 * `hosts` and the not-available stub otherwise, and each the sign-in
 * placard while the host needs a session and none is held
 * (`signedOut`), so no page of the feature reads without a credential;
 * the machine page is handed the session's memberships, by whose names
 * it draws the organizations a machine belongs to, and the page of it
 * the route names.
 *
 * @param {Object} options - The router's side
 * @param {boolean} options.hosts - Whether the host advertises `hosts`
 * @param {boolean} options.signedOut - Whether the host needs a session and none is held
 * @param {Object} options.context - The page context
 * @param {Array<Object>} options.organizations - The session's memberships
 * @returns {Array} The fourteen routes
 */
const hostsRoutes = ({ hosts, signedOut, context, organizations }) => {
  const page = (path, element) =>
    signedOut ? <SignInStub titleKey={titleOf(path)} signIn={context.signIn} /> : element;
  return gatedRoutes(
    [
      { path: '/hosts/:id', element: <HostRoute context={context} /> },
      { path: '/hosts/:id/machines', element: <MachinesRoute context={context} /> },
      {
        path: '/hosts/:id/machines/:name',
        element: <MachineRoute context={context} organizations={organizations} />,
      },
      {
        path: '/hosts/:id/machines/:name/settings',
        element: <MachineRoute context={context} organizations={organizations} page="settings" />,
      },
      {
        path: '/hosts/:id/machines/:name/snapshots',
        element: <MachineRoute context={context} organizations={organizations} page="snapshots" />,
      },
      {
        path: '/hosts/:id/machines/:name/provisioning',
        element: (
          <MachineRoute context={context} organizations={organizations} page="provisioning" />
        ),
      },
      { path: '/hosts/:id/machines/:name/console/vnc', element: <ConsoleRoute kind="vnc" /> },
      { path: '/hosts/:id/machines/:name/console/rdp', element: <ConsoleRoute kind="rdp" /> },
      { path: '/hosts/:id/networking', element: <NetworkingRoute context={context} /> },
      { path: '/hosts/:id/manage', element: <ManageRoute context={context} /> },
      { path: '/hosts/:id/devices', element: <DevicesRoute context={context} /> },
      { path: '/hosts/:id/storage', element: <StorageRoute context={context} /> },
      { path: '/hosts/:id/settings', element: <AgentSettingsRoute context={context} /> },
      { path: '/hosts/:id/settings/:name', element: <AgentSettingsRoute context={context} /> },
    ].map(({ path, element }) => ({
      path,
      open: hosts,
      element: page(path, element),
      token: 'hosts',
    }))
  );
};

/**
 * The three setup routes: the setup page at `/setup` while the host
 * advertises `setup`, the zone register at `/setup/zone` on the
 * `zoneweaver-agent` role behind `setup`, and the server setup at
 * `/setup/server` on the `hyperweaver-server` role behind `hosts`; the
 * first two stand while setup is owed too.
 *
 * @param {Object} options - The router's side
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {boolean} options.hosts - Whether the host advertises `hosts`
 * @param {Object} options.context - The page context
 * @returns {{ setupRoute: import('react').ReactElement|null, zoneRoute: import('react').ReactElement, serverRoute: import('react').ReactElement }} The routes
 */
const setupRoutesOf = ({ status, hosts, context }) => ({
  setupRoute: hasFeature(status, 'setup') ? (
    <Route path="/setup" element={<SetupPage setup={setupApi} />} />
  ) : null,
  zoneRoute: (
    <Route
      path="/setup/zone"
      element={gated(
        status.role === 'zoneweaver-agent' && hasFeature(status, 'setup'),
        <ZoneRegister />,
        titleOf('/setup/zone'),
        'setup'
      )}
    />
  ),
  serverRoute: (
    <Route
      path="/setup/server"
      element={gated(
        hosts && isServerRole(status),
        <ServerSetup context={context} />,
        titleOf('/setup/server'),
        'hosts'
      )}
    />
  ),
});

/**
 * The page of a route the router does not know: the ErrorPage with the
 * fault the server stamped on `<html>` on any host, the ErrorPage's 404
 * on a `cookie` host, and home elsewhere.
 */
const unknownRouteFor = ({ cookie, ticketUrl, admin }) => {
  if (hasServerFault()) {
    return <ErrorPage ticketUrl={ticketUrl} admin={admin} />;
  }
  if (cookie) {
    return <ErrorPage ticketUrl={ticketUrl} admin={admin} notFound />;
  }
  return <Navigate to="/" />;
};

const homeElementFor = ({
  cookie,
  fleet,
  hosts,
  signedOut,
  status,
  account,
  collections,
  context,
  mode,
  globalAdmin,
}) => {
  if (cookie) {
    if (!account.user) {
      return <Navigate to={returnTo.signInTo('/')} replace />;
    }
    return issuerProfile({ account, globalAdmin });
  }
  if (fleet) {
    return <FleetPage context={context} mode={mode} />;
  }
  if (hosts) {
    const server = isServerRole(status);
    if (signedOut) {
      return (
        <SignInStub
          titleKey={server ? 'hosts.page.title' : 'dashboard.dashboard.infrastructureOverview'}
          signIn={context.signIn}
        />
      );
    }
    return server ? <HostsPage context={context} /> : <DashboardPage context={context} />;
  }
  return <HomePage collections={collections} context={context} />;
};

/**
 * Every route the app serves: the fleet page at `/` and the VM page at
 * `/vm/:instance` while the host advertises `fleet`, the hosts page at
 * `/` on the `hyperweaver-server` role and the dashboard at `/` on an
 * agent role, with the host page at `/hosts/:id`, the machines of a host at
 * `/hosts/:id/machines` and the machine page at
 * `/hosts/:id/machines/:name` while the host advertises `hosts`, every
 * one of them and the hosts home the sign-in placard for a visitor on a
 * host that needs a session, so nothing of the hosts feature reads
 * without a credential, else the home page
 * and the collection routes from the registry in the host's order (the
 * issuer's profile at `/` on a `cookie` host, an anonymous visitor sent
 * to sign in with `/` as the return path), the setup page at `/setup` while the host
 * advertises `setup`, every other route sent there until setup is complete
 * and the page drawing its complete state after, hyperweaver-ui's server
 * setup at `/setup/server` on the `hyperweaver-server` role behind `hosts`
 * and its zone register at `/setup/zone` on the `zoneweaver-agent` role
 * behind `setup`, reachable while setup is owed too, each feature route gated by
 * its feature token or by the host's first `auth` token (the search page
 * at `/search` behind `search`, the token the navbar's box answers to),
 * and the identity
 * contract's five groups behind the `cookie` token and their feature
 * tokens, a route the host lacks rendering `NotAvailableStub` instead
 * (`/user/integrations` and the Hyperweaver service's own page at
 * `/user/integrations/hyperweaver`, the `settings_url` its row names,
 * each drawing the ErrorPage's 404 while the issuer's answer carries no
 * `services`); the
 * shared admin pages at `/admin/config/:name` and `/admin/system` on
 * every host, the Configuration page drawing the named file of
 * `status.config`, the bare `/admin/config` redirecting to the first
 * name's route and drawing the empty state while the list is empty, on a
 * `cookie` host behind
 * the identity feature's Configuration entry; the
 * sign-in, register and profile pages take the session state, whose
 * adopted session alone sends a signed-in person off a sign-in page or
 * draws the profile, the sign-in page answering `/login` on an `apikey`
 * host too, hyperweaver-agent's six sign-ins, and `/profile` there the
 * one profile page over the key's record read-only; `/error` draws the
 * identity contract's ErrorPage on every host, as does any route the
 * served page reached with a fault the server stamped on `<html>`
 * (`data-error-status`, the way a backend answers `index.html` in place
 * of a failed browser navigation), the admin details fold on the issuer
 * alone; on a `cookie` host every unknown route draws the ErrorPage's
 * 404 too, every other host sending an unstamped unknown route home; on
 * a `backend` host the
 * identity feature's Users and All organizations pages answer
 * `/admin/users` and `/admin/organizations` over the host's own accounts
 * and the bare `/admin` redirects to the organizations; one account's
 * record page answers `/admin/users/:id` wherever the Users page does.
 */
const AppRoutes = ({
  account,
  collections,
  context,
  mode,
  setupComplete,
  globalAdmin,
  afterSignIn,
  notifications = null,
  ticketUrl = '',
}) => {
  const status = useStatus();
  const backend = authMethod(status) === 'backend';
  const cookie = authMethod(status) === 'cookie';
  const apiKey = authMethod(status) === 'apikey';
  const fleet = hasFeatureStrict(status, 'fleet');
  const hosts = hasFeatureStrict(status, 'hosts');
  const signedOut = authMethod(status) !== 'none' && !account.user;
  const { organizations, oidc } = account;
  const { setupRoute, zoneRoute, serverRoute } = setupRoutesOf({ status, hosts, context });

  if (hasFeature(status, 'setup') && !setupComplete) {
    return (
      <Routes>
        {setupRoute}
        {zoneRoute}
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  const homeElement = homeElementFor({
    cookie,
    fleet,
    hosts,
    signedOut,
    status,
    account,
    collections,
    context,
    mode,
    globalAdmin,
  });

  return (
    <Routes>
      {setupRoute}
      {zoneRoute}
      {serverRoute}
      <Route path="/" element={homeElement} />
      <Route
        path="/vm/:instance"
        element={
          fleet ? (
            <VmRoute mode={mode} user={account.user} />
          ) : (
            <Stub titleKey={titleOf('/vm/:instance')} token="fleet" />
          )
        }
      />
      {hostsRoutes({ hosts, signedOut, context, organizations })}
      <Route path="/about" element={<AboutRoute oidc={oidc} clientId={account.clientId} />} />
      <Route
        path="/search"
        element={
          hasFeature(status, 'search') ? (
            <SearchPage context={context} />
          ) : (
            <Stub titleKey={titleOf('/search')} token="search" />
          )
        }
      />
      <Route
        path="/organizations/discover"
        element={
          hasFeature(status, 'discover') ? (
            <DiscoveryPage
              session={session}
              returnTo={returnTo}
              organizations={cookie ? issuerOrganizations : organizationsAdapter}
              orgMark={<BrandLogo className="logo-lg icon-with-margin" />}
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
          backend || cookie || apiKey ? (
            <LoginPage
              session={session}
              events={events}
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
            localProfileFor({ backend, apiKey, account, status, globalAdmin }) ||
            gated(cookie, issuerProfile({ account, globalAdmin }), titleOf('/profile'), 'backend')
          }
        />
      ))}
      {signedInRoutes({
        status,
        cookie,
        account,
        globalAdmin,
        notifications,
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
      <Route
        path="/error"
        element={<ErrorPage ticketUrl={ticketUrl} admin={cookie && globalAdmin} />}
      />
      <Route
        path="*"
        element={unknownRouteFor({ cookie, ticketUrl, admin: cookie && globalAdmin })}
      />
    </Routes>
  );
};

AppRoutes.propTypes = {
  account: sessionStateShape.isRequired,
  collections: PropTypes.arrayOf(collectionShape).isRequired,
  context: pageContextShape.isRequired,
  mode: PropTypes.string.isRequired,
  setupComplete: PropTypes.bool.isRequired,
  globalAdmin: PropTypes.bool.isRequired,
  afterSignIn: PropTypes.func.isRequired,
  notifications: notificationsAdapterShape,
  ticketUrl: PropTypes.string,
};

export default AppRoutes;
