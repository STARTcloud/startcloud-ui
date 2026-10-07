import PropTypes from 'prop-types';
import { Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes, matchPath, useLocation, useParams } from 'react-router-dom';

import BrandLogo from '../components/common/BrandLogo';
import NotAvailableStub from '../components/common/NotAvailableStub';
import SignInPlacard from '../components/common/SignInPlacard';
import { notificationsAdapterShape } from '../components/layout/NotificationsModal';
import {
  ACTIVE_ORG_KEY,
  JOIN_INTENT_KEY,
  LOGIN_METHOD_KEY,
  SILENT_SSO_KEY,
} from '../config/constants';
import { GuardProvider } from '../contexts/GuardContext';
import { useStatus } from '../contexts/StatusContext';
import { AboutRoute } from '../features/about';
import {
  AdminPage,
  adminConfig,
  appUpdate,
  organizationBodyOf,
  organizationRowOf,
  pageOf,
  resumeUser,
  roleNames,
  searchKinds as adminSearchKinds,
  setUserRoles,
  sidebar as adminSidebar,
  storage,
  suspendUser,
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
  searchKinds as catalogSearchKinds,
  sidebar as catalogSidebar,
} from '../features/catalog';
import { ErrorPage, hasServerFault } from '../features/errors';
import {
  DashboardPage,
  HostPage,
  HostSectionPage,
  HostsPage,
  MachinePage,
  MachinesPage,
  StandaloneConsole,
  StandaloneRdpConsole,
  actionMenu as hostsActionMenu,
  controlCommands as hostsControlCommands,
  footerPane as hostsFooterPane,
  hostCrumbs,
  isServerRole,
  searchKinds as hostsSearchKinds,
  sidebar as hostsSidebar,
} from '../features/hosts';
import {
  IDENTITY_ADMIN_PAGES,
  IdentityAdminPage,
  issuerOrganizations as issuerAdminOrganizations,
  issuerUsers,
  searchKinds as identitySearchKinds,
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
  searchKinds as profileSearchKinds,
  serviceAccounts,
  setPrimaryOrganization,
  sidebar as profileSidebar,
  stepUp,
  verifyMail,
} from '../features/profile';
import { SearchPage, searchKinds as pageSearchKinds } from '../features/search';
import { ServerSetup, SetupPage, ZoneRegister, setupApi } from '../features/setup';
import { UserTermsPage, issuerTerms } from '../features/terms';
import { TfaCodePage, TfaMethodPage } from '../features/tfa';
import { FleetPage, VmPage, sidebar as vdiSidebar } from '../features/vdi';
import { configNamesOf } from '../hooks/useConfigTree';
import { sessionStateShape } from '../hooks/useSession';
import { ownTimezone } from '../lib/apiKeySession';
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
 * the standard OpenID Connect claims.
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
 * The writes of a local account's own record on a `backend` host.
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
 * The profile page's `account` adapter of a `backend` host: read-only
 * for an identity provider's session, read-write for a local account.
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

const apiKeyProfile = async () => {
  const user = (await session.reload())?.user;
  return user ? { ...user, preferences: { timezone: ownTimezone() } } : null;
};

const PREFERENCE_MEMBERS = ['language', 'mode', 'theme', 'motion', 'timezone'];

const apiKeyPreferences = patch => {
  const picked = Object.fromEntries(
    Object.entries(patch).filter(([member]) => PREFERENCE_MEMBERS.includes(member))
  );
  return Object.keys(picked).length > 0 ? session.savePreferences(picked) : Promise.resolve();
};

/**
 * The profile page's read-only `account` adapter of an `apikey` host,
 * writing the preferences alone, the record read with the browser's own
 * `timezone` key as its `preferences.timezone` because the agent keeps no
 * user preferences.
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
 * organizations-with-users answer.
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

/**
 * The All organizations page's adapter of a `backend` host; a rename
 * reads the profile again, the uuid the active organization is kept by
 * never moving.
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
      await session.refresh();
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

/**
 * The shared admin feature's adapter for the host behind `status`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @returns {Object} The adapter `adminShape` describes
 */
const adminAdapterFor = status => {
  const method = authMethod(status);
  return {
    ...(method === 'backend' ? backendAdminMembers : {}),
    ...(hasConfigFiles(status) ? { config: adminConfig } : {}),
    ...(hasFeature(status, 'update') ? { update: appUpdate } : {}),
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
  '/admin/update': 'hosts.nav.update',
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
  '/hosts/:id/network/interfaces': 'hosts.overview.interfaces',
  '/hosts/:id/network/topology': 'pages.hostNetworking.topologyHeading',
  '/hosts/:id/network/addresses': 'host.ipAddressTable.title',
  '/hosts/:id/network/routes': 'host.routingTable.routingTable',
  '/hosts/:id/network/bandwidth': 'host.bandwidthTable.title',
  '/hosts/:id/network/links': 'hosts.nav.links',
  '/hosts/:id/network/spaces': 'hosts.nav.spaces',
  '/hosts/:id/network/hostname': 'host.hostnameSettings.title',
  '/hosts/:id/network/hosts-file': 'host.hostsFileEditor.hostsFile',
  '/hosts/:id/network/dns': 'host.dnsSettings.dnsResolver',
  '/hosts/:id/storage/pools': 'hosts.nav.pools',
  '/hosts/:id/storage/snapshots': 'navbar.contextTabs.snapshots',
  '/hosts/:id/storage/arc': 'hosts.nav.arc',
  '/hosts/:id/storage/disks': 'hosts.nav.disks',
  '/hosts/:id/storage/media': 'hosts.nav.media',
  '/hosts/:id/storage/boot-environments': 'pages.hostManage.tabBootEnvironments',
  '/hosts/:id/devices': 'navbar.contextTabs.devices',
  '/hosts/:id/system/services': 'pages.hostManage.tabServices',
  '/hosts/:id/system/processes': 'pages.hostManage.tabProcesses',
  '/hosts/:id/system/users': 'pages.hostManage.tabUserGroups',
  '/hosts/:id/system/time': 'pages.hostManage.tabTime',
  '/hosts/:id/system/runlevel': 'hosts.manage.runlevel.title',
  '/hosts/:id/system/logs': 'hosts.nav.logs',
  '/hosts/:id/system/faults': 'pages.hostManage.tabFaultManagement',
  '/hosts/:id/updates/packages': 'pages.hostManage.tabPackages',
  '/hosts/:id/updates/system': 'host.systemUpdates.title',
  '/hosts/:id/updates/repositories': 'host.packageManagement.repositories',
  '/hosts/:id/provisioning/recipes': 'pages.hostManage.tabRecipes',
  '/hosts/:id/provisioning/templates': 'pages.hostManage.tabTemplates',
  '/hosts/:id/provisioning/provisioners': 'pages.hostManage.tabProvisioners',
  '/hosts/:id/provisioning/network': 'pages.hostManage.tabProvisioningNetwork',
  '/hosts/:id/provisioning/installers': 'pages.hostManage.tabInstallerFiles',
  '/hosts/:id/provisioning/orchestration': 'pages.hostManage.tabOrchestration',
  '/hosts/:id/files': 'pages.hostManage.tabFileManager',
  '/hosts/:id/agent/config/:name': 'admin.config.title',
  '/hosts/:id/agent/secrets': 'hosts.nav.secrets',
  '/hosts/:id/agent/api-keys': 'hosts.nav.apiKeys',
  '/hosts/:id/agent/database': 'pages.hostManage.tabDatabase',
  '/hosts/:id/agent/update': 'hosts.nav.update',
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

/**
 * The routes of the host's column, each `[segment, section]`.
 */
const HOST_SECTION_ROUTES = [
  ['network/interfaces', 'interfaces'],
  ['network/topology', 'topology'],
  ['network/addresses', 'addresses'],
  ['network/routes', 'routes'],
  ['network/bandwidth', 'bandwidth'],
  ['network/links', 'links'],
  ['network/spaces', 'spaces'],
  ['network/hostname', 'hostname'],
  ['network/hosts-file', 'hosts-file'],
  ['network/dns', 'dns'],
  ['storage/pools', 'pools'],
  ['storage/snapshots', 'snapshots'],
  ['storage/arc', 'arc'],
  ['storage/disks', 'disks'],
  ['storage/media', 'media'],
  ['storage/boot-environments', 'boot-environments'],
  ['devices', 'devices'],
  ['system/services', 'services'],
  ['system/processes', 'processes'],
  ['system/users', 'users'],
  ['system/time', 'time'],
  ['system/runlevel', 'runlevel'],
  ['system/logs', 'logs'],
  ['system/faults', 'faults'],
  ['updates/packages', 'packages'],
  ['updates/system', 'system-updates'],
  ['updates/repositories', 'repositories'],
  ['provisioning/recipes', 'recipes'],
  ['provisioning/templates', 'templates'],
  ['provisioning/provisioners', 'provisioners'],
  ['provisioning/network', 'provisioning-network'],
  ['provisioning/installers', 'installers'],
  ['provisioning/orchestration', 'orchestration'],
  ['files', 'files'],
  ['agent/secrets', 'secrets'],
  ['agent/api-keys', 'api-keys'],
  ['agent/database', 'database'],
  ['agent/update', 'update'],
];

const hostTrail = (section, machinePage = '') => ({
  crumbs: ({ pageName, pageNoun, status, params, t }) =>
    hostCrumbs({
      id: params.id,
      section,
      name: params.name || '',
      machinePage,
      label: pageName || params.id,
      noun: pageNoun,
      aggregate: isServerRole(status),
      t,
    }),
});

const CRUMB_PARENTS = {
  '/org-console': {
    parent: '/user/organizations',
    name: ({ activeOrganization }) => activeOrganization?.name || '',
  },
  '/admin/users/:id': {
    parent: '/admin/users',
    name: ({ pageName, t }) => pageName || t('admin.users.placeholder'),
  },
  '/hosts/:id': hostTrail('overview'),
  '/hosts/:id/machines': hostTrail('machines'),
  '/hosts/:id/machines/:name': hostTrail('machine'),
  '/hosts/:id/machines/:name/settings': hostTrail('machine', 'settings'),
  '/hosts/:id/machines/:name/snapshots': hostTrail('machine', 'snapshots'),
  '/hosts/:id/machines/:name/provisioning': hostTrail('machine', 'provisioning'),
  ...Object.fromEntries(
    HOST_SECTION_ROUTES.map(([segment, section]) => [`/hosts/:id/${segment}`, hostTrail(section)])
  ),
  '/hosts/:id/agent/config/:name': hostTrail('config'),
};

/**
 * The crumbs of a page no sidebar row matches, by its route: the parent
 * row's path and the page's name resolver, or the whole trail's resolver,
 * each called with `{ activeOrganization, pageName, pageNoun, status, t }`
 * and the route's `params`.
 *
 * @param {string} pathname - The current path
 * @returns {{ parent: string, name: Function }|{ crumbs: Function }|null} The route's entry, null for a route none names
 */
export const routeCrumbParent = pathname => {
  for (const [path, entry] of Object.entries(CRUMB_PARENTS)) {
    const match = matchPath(path, pathname);
    if (match && entry.crumbs) {
      return { crumbs: held => entry.crumbs({ ...held, params: match.params }) };
    }
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
 * The title key of the longest registered route the pathname equals or
 * descends from.
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

const routesOf = sections =>
  new Set(sections.flatMap(section => section.items.map(item => item.to)));

const foldSections = (sections, incoming) => {
  const routes = routesOf(sections);
  return incoming.reduce((folded, section) => {
    const items = section.items.filter(item => !routes.has(item.to));
    if (items.length === 0) {
      return folded;
    }
    const at = folded.findIndex(held => held.key === section.key);
    if (at === -1) {
      return [...folded, { ...section, items }];
    }
    return folded.map((held, index) =>
      index === at ? { ...held, items: [...held.items, ...items] } : held
    );
  }, sections);
};

const oneHeading = group => {
  if (!group.tree) {
    return group;
  }
  const labels = new Set(
    (group.sections || [])
      .filter(section => section.items.length > 0)
      .map(section => section.labelKey)
  );
  const useGroupTree = group.tree;
  const useOneHeadingTree = () => {
    const answer = useGroupTree();
    return labels.has(answer.labelKey) ? { ...answer, labelKey: null } : answer;
  };
  return { ...group, tree: useOneHeadingTree };
};

const foldInto = (folded, group) => {
  const at = folded.findIndex(held => held.key === group.key);
  if (at === -1) {
    return [...folded, group];
  }
  return folded.map((held, index) => {
    if (index !== at) {
      return held;
    }
    const standing = Boolean(held.tree || held.views);
    return {
      ...held,
      sections: foldSections(held.sections || [], group.sections || []),
      ...(!standing && group.tree ? { tree: group.tree } : {}),
      ...(!standing && group.views ? { views: group.views } : {}),
    };
  });
};

/**
 * The sidebar groups folded by key, a later group's sections and rows
 * joining the first group of its key.
 *
 * @param {Array<Object>} groups - The groups in mount order
 * @returns {Array<Object>} One group per key, in the order each key first appears
 */
const foldGroups = groups => groups.reduce(foldInto, []).map(oneHeading);

/**
 * Every mounted feature's sidebar groups in the order catalog, hosts,
 * profile, identity (on a `cookie` host), vdi and admin, folded by key;
 * empty while the host does not list `sidebar`.
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
  return foldGroups([
    ...catalogSidebar(status, account, collections),
    ...hostsSidebar(status, account),
    ...profileSidebar(status, account, issuerIntegrations, profileAccountFor({ status, account })),
    ...(cookie ? identitySidebar(status, account, admin) : []),
    ...vdiSidebar(status, account),
    ...adminSidebar(status, account, admin),
  ]);
};

/**
 * The search kind table: every mounted feature's `searchKinds` answer in
 * the order catalog, hosts, identity (on a `cookie` host), admin, profile, search,
 * each kind holding its owners in that order, a row's route falling
 * through to the next owner when one cannot place it; empty while the
 * host does not list `search`.
 *
 * @param {Object} options - The shell's side
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {Object} options.account - The session state from `useSession`
 * @param {Array<Object>} options.collections - The host's mounted collection definitions
 * @returns {Object<string, Array<Object>>} The owners of each kind
 */
export const searchKindsFor = ({ status, account, collections }) => {
  if (!hasFeature(status, 'search')) {
    return {};
  }
  const cookie = authMethod(status) === 'cookie';
  return [
    ...catalogSearchKinds(status, collections),
    ...hostsSearchKinds(status, account),
    ...(cookie ? identitySearchKinds(status, account) : []),
    ...adminSearchKinds(status, account, adminAdapterFor(status)),
    ...profileSearchKinds(status, account),
    ...pageSearchKinds(status, account),
  ].reduce(
    (table, entry) => ({ ...table, [entry.kind]: [...(table[entry.kind] || []), entry] }),
    {}
  );
};

/**
 * The first non-null `actionMenu(status, account)` answer of the mounted
 * features, drawn with the session's user.
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
 * The first non-null `controlCommands(status, account)` answer of the
 * mounted features, drawn with the session's user wherever the feature is
 * mounted.
 *
 * @param {Object} options - The shell's side
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {Object} options.account - The session state from `useSession`
 * @returns {import('react').ReactElement|null} The command list `App` mounts
 */
export const controlCommandsFor = ({ status, account }) => {
  const Commands =
    [hostsControlCommands].map(commands => commands(status, account)).find(Boolean) || null;
  if (!Commands) {
    return null;
  }
  return (
    <Suspense fallback={null}>
      <Commands user={account.user} />
    </Suspense>
  );
};

/**
 * The first non-null `footerPane(status, account)` answer of the mounted
 * features, the views hook of the footer's pane.
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
 * The sign-in placard a hosts route draws for a visitor on a host that
 * needs a session.
 */
const SignInStub = ({ titleKey, signIn }) => {
  const { t } = useTranslation();
  return <SignInPlacard title={t(titleKey)} user={null} onSignIn={signIn} />;
};

SignInStub.propTypes = {
  titleKey: PropTypes.string.isRequired,
  signIn: PropTypes.func.isRequired,
};

/**
 * One page of the shared admin feature inside the step-up window, the
 * not-available stub without `admin`, or without `update` for the Update
 * page.
 */
const AdminRoute = ({ globalAdmin, user = null, page = 'config' }) => {
  const status = useStatus();
  const admin = useMemo(() => adminAdapterFor(status), [status]);
  if (!hasFeature(status, 'admin')) {
    return <Stub titleKey={titleOf('/admin')} token="admin" />;
  }
  if (page === 'update' && !hasFeature(status, 'update')) {
    return <Stub titleKey={titleOf('/admin/update')} token="update" />;
  }
  return (
    <GuardProvider stepUp={stepUp} hasPassword={Boolean(user?.has_local_auth)}>
      <AdminPage
        session={session}
        returnTo={returnTo}
        allowed={globalAdmin}
        admin={admin}
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

/**
 * One section page of a host.
 */
const HostSectionRoute = ({ context, section }) => {
  const { id } = useParams();
  return <HostSectionPage id={id} context={context} section={section} />;
};

HostSectionRoute.propTypes = {
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
};

/**
 * The agent's Configuration page of one file inside a `GuardProvider`.
 */
const HostConfigRoute = ({ context }) => {
  const { id, name } = useParams();
  return (
    <GuardProvider stepUp={stepUp} hasPassword={Boolean(context.user?.has_local_auth)}>
      <HostSectionPage id={id} context={context} section="config" name={name} />
    </GuardProvider>
  );
};

HostConfigRoute.propTypes = {
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

const interstitialRoutes = ({ status, cookie, account }) => {
  const open = hasFeature(status, 'interstitials');
  const signedIn = cookie && open;
  const row = (path, gate, element) => ({ path, open: gate, element, token: 'interstitials' });
  return gatedRoutes([
    row('/oauth2/consent', signedIn, <ConsentPage returnTo={returnTo} />),
    row('/activate', signedIn, <DeviceActivatePage account={account} returnTo={returnTo} />),
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
    { path: '/admin/update', page: 'update' },
  ].map(({ path, page }) => (
    <Route
      key={path}
      path={path}
      element={<AdminRoute globalAdmin={globalAdmin} user={user} page={page} />}
    />
  )),
];

/**
 * The hosts feature's routes, each open while the host advertises
 * `hosts` and drawing the sign-in placard while a needed session is not
 * held.
 *
 * @param {Object} options - The router's side
 * @param {boolean} options.hosts - Whether the host advertises `hosts`
 * @param {boolean} options.signedOut - Whether the host needs a session and none is held
 * @param {Object} options.context - The page context
 * @param {Array<Object>} options.organizations - The session's memberships
 * @returns {Array} The routes
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
      ...HOST_SECTION_ROUTES.map(([segment, section]) => ({
        path: `/hosts/:id/${segment}`,
        element: <HostSectionRoute context={context} section={section} />,
      })),
      { path: '/hosts/:id/agent/config/:name', element: <HostConfigRoute context={context} /> },
    ].map(({ path, element }) => ({
      path,
      open: hosts,
      element: page(path, element),
      token: 'hosts',
    }))
  );
};

/**
 * The setup page, the zone register and the server setup routes.
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
 * The page of a route the router does not know: the server's fault, the
 * 404 on a `cookie` host, or home.
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
 * What a signed-out visitor is shown on a host that needs a session and
 * does not list `landing`, on any route but an auth path: nothing until
 * the session has answered, then the sign-in page with the page kept as
 * the return path, the ended session's page while one is held; the route
 * itself, `undefined`, everywhere else and where the host's sign-in is
 * one click.
 *
 * @param {Object} options - The router's side
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {Object} options.account - The session state from `useSession`
 * @param {boolean} options.signedOut - Whether the host needs a session and none is held
 * @param {string} options.pathname - The current path
 * @param {string} options.search - The current query
 * @returns {import('react').ReactElement|null|undefined} The redirect, null before the answer, undefined to draw the route
 */
const signInRedirectFor = ({ status, account, signedOut, pathname, search }) => {
  if (!signedOut || hasFeature(status, 'landing') || returnTo.onAuthPage(pathname)) {
    return undefined;
  }
  if (!account.loaded) {
    return null;
  }
  const signInTo = returnTo.signInTo(account.sessionEnded?.returnTo || `${pathname}${search}`);
  return signInTo ? <Navigate to={signInTo} replace /> : undefined;
};

/**
 * What stands before every route: the setup routes alone while the host
 * lists `setup` and setup is incomplete, else what `signInRedirectFor`
 * answers, `undefined` meaning the routes draw.
 *
 * @param {Object} options - The router's side, `signInRedirectFor`'s members with `setupComplete`, `setupRoute` and `zoneRoute`
 * @returns {import('react').ReactElement|null|undefined} The gate, or undefined
 */
const gateFor = ({ status, setupComplete, setupRoute, zoneRoute, ...rest }) => {
  if (hasFeature(status, 'setup') && !setupComplete) {
    return (
      <Routes>
        {setupRoute}
        {zoneRoute}
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }
  return signInRedirectFor({ status, ...rest });
};

/**
 * Every route the app serves, each gated by its feature token or the
 * host's first `auth` token, a route the host lacks drawing
 * `NotAvailableStub`; every route goes to `/setup` while setup is
 * incomplete, and a signed-out visitor is sent to sign in as
 * `signInRedirectFor` says.
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
  const { pathname, search } = useLocation();
  const backend = authMethod(status) === 'backend';
  const cookie = authMethod(status) === 'cookie';
  const apiKey = authMethod(status) === 'apikey';
  const fleet = hasFeatureStrict(status, 'fleet');
  const hosts = hasFeatureStrict(status, 'hosts');
  const signedOut = authMethod(status) !== 'none' && !account.user;
  const { organizations, oidc } = account;
  const { setupRoute, zoneRoute, serverRoute } = setupRoutesOf({ status, hosts, context });

  const gate = gateFor({
    status,
    setupComplete,
    setupRoute,
    zoneRoute,
    account,
    signedOut,
    pathname,
    search,
  });
  if (gate !== undefined) {
    return gate;
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
      {interstitialRoutes({ status, cookie, account })}
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
