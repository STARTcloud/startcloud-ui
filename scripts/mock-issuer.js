import { randomBytes } from 'crypto';
import http from 'http';
import process from 'process';

import {
  BRUTE_FORCE,
  CLIENT_HEALTH,
  HEATMAP,
  INSIGHTS,
  LOGINS,
  ORGANIZATIONS,
  PLACEHOLDERS,
  RATE_LIMIT,
  REGISTRATIONS,
  RESTART_STATUS,
  ROLES,
  SERVICE_USAGE,
  SESSIONS,
  STATS,
  TERMS,
  USERS,
} from '../src/features/identity/utils/examples.js';

const PORT = Number(process.env.PORT) || 3443;
const XSRF = randomBytes(16).toString('hex');
const PROBS = 'https://auth.startcloud.com/probs/';
const TYPES = {
  400: 'bad-request',
  401: 'authentication',
  403: 'forbidden',
  404: 'not-found',
  409: 'conflict',
  422: 'validation',
  429: 'throttled',
  500: 'internal',
  503: 'internal',
};
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const WAIT_SECONDS = 10;
const STEP_UP_MS = 5 * 60 * 1000;
const HEARTBEAT_MS = 25 * 1000;
const EVENTS_DELAY_MS = 3000;
const EMAIL = /^[^\s@]+@[^\s@]+$/;
const SAFE_PATH = /^\/(?![/\\])/;
const UUID = '8f2c4b1e-7a6d-4c2f-9e3b-1d5a6c7e8f90';
const MASKED_PHONE = '+1 *** *** 4242';
const NOW = () => new Date().toISOString();
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const STATUS = {
  role: 'auth-server',
  version: '1.9.1',
  brand: {
    name: 'STARTcloud',
    logoUrl: '/brand/startcloud/icon.png',
    changelog: 'https://github.com/STARTcloud/authorization-server-private/releases',
    theme: 'light',
  },
  auth: ['cookie'],
  collections: [],
  features: [
    'local-accounts',
    'tfa',
    'onboarding',
    'interstitials',
    'policies',
    'org-console',
    'discover',
    'invitations',
    'integrations',
    'search',
    'inbox',
    'admin',
    'notifications',
    'health',
    'events',
    'footer',
  ],
  links: { docs: '', contact: '' },
  ticket: {
    baseUrl: 'https://xd.prominic.net/app/apprequest.nsf/router?openagent',
    reqType: 'sso',
    fallbackCustomerId: 'A55DF1',
  },
  events: { path: '/api/events', topics: ['notifications', 'session', 'admin'] },
  config: ['application', 'security', 'sites', 'clients', 'providers', 'mail'],
};

const health = () => ({
  status: 'ok',
  timestamp: NOW(),
  services: { database: 'ok', mail: 'ok', sms: 'ok', signing_keys: 'ok' },
});

const RULES = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $defs: {
    slug: {
      type: 'string',
      allOf: [{ pattern: '^[A-Za-z0-9.-]+$' }, { not: { pattern: '\\.\\.' } }],
      minLength: 1,
      maxLength: 255,
    },
    identifier: {
      type: 'string',
      allOf: [{ pattern: '^[0-9a-zA-Z][0-9a-zA-Z._-]*$' }, { not: { pattern: '\\.\\.' } }],
      maxLength: 255,
    },
    email: {
      type: 'string',
      pattern:
        "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$",
      maxLength: 255,
    },
    orgCode: { type: 'string', pattern: '^[0-9A-F]{6}$' },
    providerName: { type: 'string', pattern: '^[a-z0-9_]+$' },
    hex: { type: 'string', pattern: '^[a-fA-F0-9]+$' },
    icon: { type: 'string', pattern: '^[a-z0-9 -]{1,64}$' },
    languageTag: { type: 'string', pattern: '^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$', maxLength: 10 },
    timezone: { type: 'string', pattern: '^(?:UTC|[A-Za-z_]+(?:/[A-Za-z0-9_+-]+)+)$' },
  },
  forms: {
    password: {
      type: 'object',
      required: ['password'],
      properties: { password: { type: 'string', minLength: 15, maxLength: 128 } },
    },
    register: {
      type: 'object',
      required: ['email'],
      properties: { email: { $ref: '#/$defs/email' } },
    },
    recovery: {
      type: 'object',
      required: ['email'],
      properties: { email: { $ref: '#/$defs/email' } },
    },
    terms: {
      type: 'object',
      required: ['name', 'friendly_name', 'version', 'type', 'content'],
      properties: {
        name: { $ref: '#/$defs/slug', unique: 'global' },
        friendly_name: { type: 'string', minLength: 1, maxLength: 255 },
        icon: { $ref: '#/$defs/icon' },
        version: { type: 'string', minLength: 1, maxLength: 32 },
        type: { type: 'string', enum: ['site', 'client'] },
        is_public: { type: 'boolean' },
        display_order: { type: 'integer', minimum: 0 },
        content: { type: 'string' },
      },
    },
    organization: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 1, pattern: '\\S', unique: 'global' },
        email: { $ref: '#/$defs/email' },
        website_url: { type: 'string', format: 'uri' },
        logo_url: { type: 'string', format: 'uri' },
        description: { type: 'string' },
        locale: { $ref: '#/$defs/languageTag' },
        timezone: { $ref: '#/$defs/timezone' },
        telephone: { type: 'string' },
        access_mode: { type: 'string', enum: ['invite', 'request', 'private'] },
        default_role: { type: 'string', enum: ['MEMBER', 'ADMIN'] },
        customer_id: { $ref: '#/$defs/orgCode' },
      },
    },
  },
};

const POLICY_LINKS = [
  { name: 'privacy', label: 'Privacy Policy', url: '/public/policies/privacy' },
  { name: 'terms', label: 'Terms of Service', url: '/public/policies/terms' },
];

const METHODS = {
  methods: [
    { id: 'magic-link', name: 'Email link', enabled: true },
    { id: 'local', name: 'Password', enabled: true },
    { id: 'passkey', name: 'Passkey', enabled: true, conditional_ui: true },
    { id: 'oidc-github', name: 'GitHub', enabled: true, icon_url: '/brand/providers/github.svg' },
  ],
  default_provider: null,
  silent_login: false,
  local_registration_enabled: true,
  login_mode: 'magic_link',
  cancel: false,
  policies: POLICY_LINKS,
  reset_link_ttl_minutes: 10,
  magic_link_ttl_minutes: 15,
};

const TFA_METHODS = {
  sms: [{ id: 7, label: 'Work phone', masked: MASKED_PHONE }],
  app: [{ id: 3, label: 'Phone' }],
  passkey: true,
  backup_codes: true,
  locked: ['SMS'],
  preferred: { method: 'APP', authenticator_id: 3 },
  sms_risk_notice: true,
};

const ENROLL = { qr: PNG, secret: 'JBSWY3DPEHPK3PXP', issuer: 'STARTcloud' };

const BACKUP_CODES = [
  'A1B2C3D4',
  'E5F6G7H8',
  'J1K2L3M4',
  'N5P6Q7R8',
  'S1T2U3V4',
  'W5X6Y7Z8',
  'B2C3D4E5',
  'F6G7H8J9',
];

const TERMS_STATE = {
  name: 'conductor-msa',
  label: 'Master Services Agreement',
  version: '2.1',
  step: 1,
  total: 2,
  client_name: 'Conductor',
  collecting: true,
  content_html: '<p>This Master Services Agreement governs the use of the Conductor platform.</p>',
  content_middle_html:
    '<p>I, <span class="tos-blank" data-tos-field="full_name">________</span>, agree to the terms above on behalf of <span class="tos-blank" data-tos-field="country">________</span>.</p>',
  content_bottom_html: '<p>By clicking I Agree &amp; Continue you accept this agreement.</p>',
  fields: [
    {
      param: 'first_name',
      label: 'First name',
      autocomplete: 'given-name',
      group: 'identity',
      control: 'text',
      span: 'half',
      required: true,
      value: 'Mark',
    },
    {
      param: 'last_name',
      label: 'Last name',
      autocomplete: 'family-name',
      group: 'identity',
      control: 'text',
      span: 'half',
      required: true,
      value: 'Gilbert',
    },
    {
      param: 'country',
      label: 'Country',
      autocomplete: 'country-name',
      group: 'address',
      control: 'country',
      span: 'half',
      required: true,
    },
  ],
  identity_group_title: 'Phone verification',
};

const POLICIES = {
  privacy: {
    name: 'privacy',
    label: 'Privacy Policy',
    version: '3.0',
    created_at: '2025-01-09T00:00:00Z',
    updated_at: '2026-08-14T00:00:00Z',
    content_html:
      '<h2>1. Information We Collect</h2><p>We collect information you provide directly to us.</p>',
  },
  terms: {
    name: 'terms',
    label: 'Terms of Service',
    version: '2.0',
    created_at: '2025-01-09T00:00:00Z',
    updated_at: '2026-01-09T00:00:00Z',
    content_html: '<h2>Terms</h2><p>These terms govern your use of the service.</p>',
  },
};

const SCOPES = [
  { id: 'openid', label: 'openid', description: 'Authenticate your identity' },
  {
    id: 'organizations',
    label: 'organizations',
    description: 'See your organization memberships and roles',
  },
];

const AUTHORIZATION_DETAILS = [
  {
    type: 'domino_vault',
    description: 'Access an ID Vault',
    locations: ['https://vault.example'],
    actions: ['read'],
    datatypes: null,
    identifier: null,
    privileges: null,
  },
];

const consent = query => ({
  client_id: query.get('client_id') || 'conductor',
  client_name: 'Conductor',
  state: query.get('state') || 'abc123',
  user_code: query.get('user_code') || null,
  action: query.get('user_code') ? '/oauth2/device_verification' : '/oauth2/authorize',
  principal: 'mark@m4kr.net',
  consent_text: null,
  scopes: SCOPES,
  authorization_details: AUTHORIZATION_DETAILS,
});

const CIBA = {
  client_name: 'Conductor',
  binding_message: 'ZX-42',
  scopes: SCOPES,
  authorization_details: AUTHORIZATION_DETAILS,
};

const LOGOUT_CONFIRM = { client_name: 'Conductor', logout_text: null };

const FRONTCHANNEL = {
  frame_urls: ['https://app.example/logout?iss=https://auth.startcloud.com&sid=abc'],
  continuation: 'https://app.example/',
  timeout_seconds: 5,
};

const LINK = {
  email: 'mark@m4kr.net',
  provider_id: 'github',
  provider_name: 'GitHub',
  provider_username: 'markgilbert',
  has_local_auth: true,
  proof: 'password',
  account: { name: 'Mark Gilbert', email: 'mark@m4kr.net' },
};

const FAVORITES = [
  {
    client_id: 'conductor',
    client_name: 'Conductor',
    icon_url: '',
    home_url: 'https://conductor.startcloud.com/',
    custom_label: null,
    order: 0,
  },
  {
    client_id: 'boxvault',
    client_name: 'BoxVault',
    icon_url: '',
    home_url: 'https://boxvault.startcloud.com/',
    custom_label: null,
    order: 1,
  },
];

const byOrder = (first, second) => first.order - second.order;

const ADDRESS = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  country_code: '',
  formatted: '',
  latitude: null,
  longitude: null,
};

const freshProfile = () => ({
  id: 42,
  uuid: UUID,
  email: 'mark@m4kr.net',
  email_verified: true,
  name: 'Mark Gilbert',
  given_name: 'Mark',
  family_name: 'Gilbert',
  middle_name: null,
  salutation: null,
  gender: null,
  website: null,
  birthdate: null,
  picture: `/api/user/avatar/${UUID}`,
  mobile_number: { masked: MASKED_PHONE, verified: true },
  address: { ...ADDRESS },
  has_local_auth: true,
  requires_password_setup: false,
  tfa: { enabled: true, preferred_method: 'APP', preferred_authenticator_id: 3, locked: [] },
  roles: ['ROLE_USER', 'ROLE_ADMIN'],
  organizations: [
    { uuid: 'a1', name: 'Acme', roles: ['OWNER'], primary: true, personal: false },
    { uuid: 'j1', name: 'Mark Gilbert', roles: ['OWNER'], primary: false, personal: true },
  ],
  preferences: {
    language: 'en',
    theme: 'dark',
    timezone: 'America/Chicago',
    ciba_channel: 'PUSH',
    ciba_user_code_set: false,
  },
  favorite_apps: FAVORITES.map(app => ({ ...app })),
});

const MEMBERS = [
  { user_id: 42, email: 'mark@m4kr.net', name: 'Mark Gilbert', role: 'OWNER', managed_by: null },
  {
    user_id: 43,
    email: 'jgilbert@example.com',
    name: 'Jo Gilbert',
    role: 'MEMBER',
    managed_by: null,
  },
];

const organizationRecord = (uuid, name, personal) => ({
  uuid,
  name,
  personal,
  primary: uuid === 'a1',
  my_role: 'OWNER',
  can_manage: true,
  can_rename: true,
  is_owner: true,
  invite_code: personal ? '' : 'INV-7K3M9QP2',
  email: personal ? 'mark@m4kr.net' : 'ops@acme.example',
  website_url: personal ? '' : 'https://acme.example',
  logo_url: '',
  description: personal ? '' : 'Acme Inc.',
  locale: 'en',
  timezone: 'America/Chicago',
  telephone: '',
  access_mode: personal ? 'private' : 'request',
  default_role: 'MEMBER',
  address: { ...ADDRESS },
  members: personal ? [MEMBERS[0]] : MEMBERS.map(member => ({ ...member })),
  pending_invites: personal ? [] : [{ id: 5, email: 'pat@acme.example', role: 'MEMBER' }],
});

const freshOrganizations = () => [
  organizationRecord('a1', 'Acme', false),
  organizationRecord('j1', 'Mark Gilbert', true),
];

const DIRECTORY = [
  {
    uuid: 'r1',
    name: 'Prominic',
    description: 'The Prominic.NET operations team.',
    logo_url: '',
    access_mode: 'request',
    member_count: 12,
  },
  {
    uuid: 'i1',
    name: 'Hart Consulting',
    description: 'Joined by invitation.',
    logo_url: '',
    access_mode: 'invite',
    member_count: 4,
  },
  {
    uuid: 'x1',
    name: 'Nomad Field Team',
    description: '',
    logo_url: '',
    access_mode: 'private',
    member_count: 7,
  },
];

const freshJoinRequests = () => [
  {
    id: 1,
    org: 'a1',
    user: { id: 44, name: 'Sam Rivera', email: 'sam@example.com' },
    message: 'I work with the Acme operations team.',
    created_at: '2026-09-10T15:20:00Z',
  },
];

const requestEntry = ({ id, user, message, created_at: createdAt }) => ({
  id,
  user,
  message,
  created_at: createdAt,
});

const directoryRow = org => ({
  uuid: org.uuid,
  name: org.name,
  description: org.description,
  logo_url: org.logo_url,
  access_mode: org.access_mode,
  member_count: org.members ? org.members.length : org.member_count,
});

const freshLinkedAccounts = () => ({
  linked: [
    {
      provider_id: 'github',
      provider_name: 'GitHub',
      provider_username: 'markgilbert',
      provider_email: 'mark@m4kr.net',
      linked_at: '2025-03-01T00:00:00Z',
      last_used_at: '2026-09-06T13:41:00Z',
      icon_url: '/brand/providers/github.svg',
      sites: ['startcloud'],
      compat: true,
    },
  ],
  available: [
    { provider_id: 'google', provider_name: 'Google', icon_url: '/brand/providers/google.svg' },
    {
      provider_id: 'microsoft',
      provider_name: 'Microsoft',
      icon_url: '/brand/providers/microsoft.svg',
    },
  ],
});

const freshAcceptedTerms = () => [
  {
    name: 'terms',
    label: 'Terms of Service',
    icon: 'file-text',
    version: '2.0',
    accepted_at: '2026-01-10T00:00:00Z',
    type: 'site',
  },
];

const freshApplications = () => [
  {
    client_id: 'conductor',
    client_name: 'Conductor',
    icon_url: '',
    registered: true,
    first_used_at: '2025-01-09T00:00:00Z',
    last_used_at: '2026-09-06T14:00:00Z',
    active_sessions: 1,
    consent_required: true,
    consent_scopes: ['openid', 'profile', 'organizations'],
  },
];

const freshUserSessions = () => [
  {
    id: 's0',
    current: true,
    client_id: 'auth-server',
    client_name: 'STARTcloud',
    user_agent: 'Chrome on Windows',
    ip_address: '203.0.113.7',
    location: 'Austin, US',
    authorized_at: '2026-09-06T12:00:00Z',
    last_accessed_at: NOW(),
  },
  {
    id: 's1',
    current: false,
    client_id: 'conductor',
    client_name: 'Conductor',
    user_agent: 'Chrome on Windows',
    ip_address: '203.0.113.7',
    location: 'Austin, US',
    authorized_at: '2026-09-06T12:02:00Z',
    last_accessed_at: '2026-09-06T14:06:00Z',
  },
  {
    id: 's2',
    current: false,
    client_id: 'boxvault',
    client_name: 'BoxVault',
    user_agent: 'Firefox on Linux',
    ip_address: '198.51.100.2',
    location: 'Chicago, US',
    authorized_at: '2026-09-03T08:15:00Z',
    last_accessed_at: '2026-09-05T19:40:00Z',
  },
];

const freshTfaMethods = () => [
  {
    id: 7,
    type: 'SMS',
    label: 'Work phone',
    display: MASKED_PHONE,
    enabled: true,
    preferred: false,
  },
  { id: 3, type: 'APP', label: 'Phone', display: 'Phone', enabled: true, preferred: true },
  {
    id: 11,
    type: 'PASSKEY',
    label: 'YubiKey',
    display: 'auth.startcloud.com',
    enabled: true,
    preferred: false,
  },
];

const freshPasskeys = () => [
  {
    id: 11,
    label: 'YubiKey',
    rp_id: 'auth.startcloud.com',
    created_at: '2025-06-01T00:00:00Z',
    last_used_at: '2026-09-01T00:00:00Z',
  },
];

const freshNotifications = () => [
  {
    id: 'n1',
    type: 'SECURITY',
    severity: 'WARNING',
    title: 'New sign-in from Chrome on Windows',
    body: 'Austin, US · just now',
    navigate: '/user/profile/sessions',
    readAt: null,
    createdAt: NOW(),
  },
  {
    id: 'n2',
    type: 'ACCOUNT',
    severity: 'INFO',
    title: 'GitHub linked to your account',
    body: 'You can now sign in with GitHub.',
    navigate: '/user/profile/security',
    readAt: null,
    createdAt: '2026-09-05T08:02:00Z',
  },
  {
    id: 'n3',
    type: 'SYSTEM',
    severity: 'SUCCESS',
    title: 'Backup codes generated',
    body: '',
    navigate: '',
    readAt: '2026-09-04T09:00:00Z',
    createdAt: '2026-09-04T08:00:00Z',
  },
];

const BRANDING = {
  site_id: 'moonshinedev',
  theme_pack: 'moonshinedev',
  theme_css: 'https://auth.example.com/themes/moonshinedev/moonshinedev.css?v=a1b2c3',
  company_name: 'Moonshine.dev',
  logos: {
    mark: {
      src: 'https://auth.example.com/themes/moonshinedev/mark.svg',
      width: 512,
      height: 512,
      monochrome: true,
    },
    small: {
      light: 'https://auth.example.com/brand/moonshinedev/logo-small.png',
      dark: 'https://auth.example.com/brand/moonshinedev/logo-small.png',
      width: 320,
      height: 100,
    },
    icon: { src: 'https://auth.example.com/brand/moonshinedev/icon.png', width: 64, height: 64 },
  },
};

const CLAIMS = {
  sub: UUID,
  email: 'mark@m4kr.net',
  email_verified: true,
  name: 'Mark Gilbert',
  preferred_username: 'mark@m4kr.net',
  locale: 'en',
  zoneinfo: 'America/Chicago',
  preferences: { language: 'en', theme: 'dark' },
  scope: 'openid profile email organizations notifications',
};

const ERROR_DETAILS = reference => ({
  code: 'internal',
  message: 'Simulated fault for the error page',
  path: '/user/profile',
  time: NOW(),
  reference,
  user: 'mark@m4kr.net',
  trace:
    'java.lang.IllegalStateException: Simulated fault for the error page\n\tat net.prominic.auth.MockController.fault(MockController.java:42)\n\tat jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:103)',
});

const ADMIN_CONFIG = {
  schema: { type: 'object', properties: {} },
  values: {},
  baseDefaults: {},
};

const BOUND = 'configuration is bound at boot';

const bound = property => ({ ...property, requiresRestart: true, restartReason: BOUND });

const configSchema = ({ title, sections, properties }) => ({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title,
  schemaVersion: 1,
  sections,
  properties: {
    schemaVersion: { type: 'integer', readOnly: true, default: 1, title: 'Schema version' },
    ...properties,
  },
});

const SLUG_KEY = { type: 'string', pattern: '^[a-z0-9-]+$' };

const CONFIG_SCHEMAS = {
  application: configSchema({
    title: 'Application',
    sections: {
      server: { title: 'Server', order: 1 },
      application: { title: 'Application', order: 2 },
    },
    properties: {
      server: {
        type: 'object',
        section: 'server',
        subsection: 'serverSettings',
        title: 'Listener',
        properties: {
          port: bound({
            type: 'integer',
            minimum: 1,
            maximum: 65535,
            default: 8443,
            title: 'Port',
            description: 'The port the issuer listens on',
            order: 1,
          }),
          issuer: bound({
            type: 'string',
            format: 'uri',
            title: 'Issuer',
            description: 'The issuer URL every token names',
            order: 2,
          }),
        },
        required: ['issuer'],
      },
      application: {
        type: 'object',
        section: 'application',
        subsection: 'applicationSettings',
        title: 'Application',
        properties: {
          name: bound({ type: 'string', title: 'Name', order: 1 }),
          default_site: bound({ type: 'string', title: 'Default site', order: 2 }),
          log_level: bound({
            type: 'string',
            enum: ['error', 'warn', 'info', 'debug'],
            default: 'info',
            title: 'Log level',
            order: 3,
          }),
        },
      },
    },
  }),
  security: configSchema({
    title: 'Security',
    sections: { security: { title: 'Security', order: 1 } },
    properties: {
      security: {
        type: 'object',
        section: 'security',
        subsection: 'sessionSettings',
        title: 'Session',
        properties: {
          session: {
            type: 'object',
            subsection: 'sessionSettings',
            title: 'Session',
            properties: {
              timeout: bound({
                type: 'string',
                format: 'ttl',
                default: '30m',
                title: 'Session timeout',
                order: 1,
              }),
              'remember-me-days': bound({
                type: 'integer',
                minimum: 1,
                maximum: 365,
                default: 30,
                title: 'Remember-me days',
                order: 2,
              }),
            },
          },
          cors: {
            type: 'object',
            subsection: 'corsSettings',
            title: 'CORS',
            properties: {
              'allowed-origins': bound({
                type: 'array',
                items: { type: 'string' },
                title: 'Allowed origins',
                order: 1,
              }),
            },
          },
        },
      },
    },
  }),
  sites: configSchema({
    title: 'Sites',
    sections: { sites: { title: 'Sites', order: 1 } },
    properties: {
      sites: {
        type: 'object',
        section: 'sites',
        subsection: 'sites',
        title: 'Sites',
        propertyNames: SLUG_KEY,
        additionalProperties: {
          type: 'object',
          properties: {
            name: bound({ type: 'string', title: 'Name', order: 1 }),
            domains: bound({
              type: 'array',
              items: { type: 'string' },
              title: 'Domains',
              order: 2,
            }),
            customer_id: bound({
              type: 'string',
              pattern: '^[0-9A-F]{6}$',
              title: 'Customer id',
              order: 3,
            }),
          },
          required: ['name'],
        },
      },
    },
  }),
  clients: configSchema({
    title: 'Clients',
    sections: { clients: { title: 'Clients', order: 1 } },
    properties: {
      clients: {
        type: 'object',
        section: 'clients',
        subsection: 'clients',
        title: 'Clients',
        propertyNames: SLUG_KEY,
        additionalProperties: {
          type: 'object',
          properties: {
            client: {
              type: 'object',
              title: 'Client',
              properties: {
                'client-id': bound({ type: 'string', title: 'Client id', order: 1 }),
                'client-name': bound({ type: 'string', title: 'Client name', order: 2 }),
                'redirect-uris': bound({
                  type: 'array',
                  items: { type: 'string' },
                  title: 'Redirect URIs',
                  order: 3,
                }),
              },
              required: ['client-id'],
            },
          },
        },
      },
    },
  }),
  providers: configSchema({
    title: 'Identity providers',
    sections: { providers: { title: 'Identity providers', order: 1 } },
    properties: {
      providers: {
        type: 'object',
        section: 'providers',
        subsection: 'providers',
        title: 'Identity providers',
        propertyNames: SLUG_KEY,
        additionalProperties: {
          type: 'object',
          properties: {
            provider: {
              type: 'object',
              title: 'Provider',
              properties: {
                'provider-name': bound({ type: 'string', title: 'Provider name', order: 1 }),
                'issuer-uri': bound({
                  type: 'string',
                  format: 'uri',
                  title: 'Issuer URI',
                  order: 2,
                }),
                'client-id': bound({ type: 'string', title: 'Client id', order: 3 }),
                'client-secret': bound({
                  type: 'string',
                  writeOnly: true,
                  title: 'Client secret',
                  order: 4,
                }),
              },
              required: ['provider-name'],
            },
          },
        },
      },
    },
  }),
  mail: configSchema({
    title: 'Mail',
    sections: {
      mail: {
        title: 'Mail',
        order: 1,
        action: {
          kind: 'test',
          route: '/api/mail/test-smtp',
          method: 'POST',
          body: 'form',
          step_up: false,
        },
      },
    },
    properties: {
      spring: {
        type: 'object',
        section: 'mail',
        subsection: 'smtp',
        title: 'SMTP',
        properties: {
          mail: {
            type: 'object',
            subsection: 'smtp',
            title: 'SMTP',
            properties: {
              host: bound({ type: 'string', title: 'Host', order: 1 }),
              port: bound({
                type: 'integer',
                minimum: 1,
                maximum: 65535,
                default: 587,
                title: 'Port',
                order: 2,
              }),
              username: bound({ type: 'string', title: 'Username', order: 3 }),
              password: bound({ type: 'string', writeOnly: true, title: 'Password', order: 4 }),
            },
            required: ['host'],
          },
        },
      },
    },
  }),
};

const CONFIG_FILES = {
  application: {
    schemaVersion: 1,
    server: { port: 8443, issuer: 'https://auth.startcloud.com' },
    application: { name: 'STARTcloud', default_site: 'startcloud', log_level: 'info' },
  },
  security: {
    schemaVersion: 1,
    security: {
      session: { timeout: '30m', 'remember-me-days': 30 },
      cors: { 'allowed-origins': ['https://boxvault.startcloud.com'] },
    },
  },
  sites: {
    schemaVersion: 1,
    sites: {
      startcloud: { name: 'STARTcloud', domains: ['auth.startcloud.com'], customer_id: 'A55DF1' },
      moonshinedev: { name: 'Moonshine.dev', domains: ['auth.moonshine.dev'] },
    },
  },
  clients: {
    schemaVersion: 1,
    clients: {
      conductor: {
        client: {
          'client-id': 'conductor',
          'client-name': 'Conductor',
          'redirect-uris': ['https://conductor.startcloud.com/callback'],
        },
      },
      boxvault: {
        client: {
          'client-id': 'boxvault',
          'client-name': 'BoxVault',
          'redirect-uris': ['https://boxvault.startcloud.com/auth/callback'],
        },
      },
    },
  },
  providers: {
    schemaVersion: 1,
    providers: {
      github: {
        provider: {
          'provider-name': 'GitHub',
          'issuer-uri': 'https://github.com',
          'client-id': 'Iv1.4b2c8d9e',
          'client-secret': 'secret',
        },
      },
    },
  },
  mail: {
    schemaVersion: 1,
    spring: { mail: { host: 'smtp.startcloud.com', port: 587, username: 'noreply', password: '' } },
  },
};

const freshConfigs = () => JSON.parse(JSON.stringify(CONFIG_FILES));

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

const mergePatch = (target, patch) => {
  if (!isObject(patch)) {
    return patch;
  }
  const result = isObject(target) ? { ...target } : {};
  Object.entries(patch).forEach(([key, value]) => {
    if (value === null) {
      delete result[key];
    } else {
      result[key] = mergePatch(result[key], value);
    }
  });
  return result;
};

const childOf = (value, key) => (isObject(value) ? value[key] : undefined);

const changedFlags = (node, before, after, pointer = '') => {
  if (node.properties) {
    return Object.entries(node.properties).flatMap(([key, property]) =>
      changedFlags(property, childOf(before, key), childOf(after, key), `${pointer}/${key}`)
    );
  }
  if (isObject(node.additionalProperties)) {
    const keys = new Set([
      ...Object.keys(isObject(before) ? before : {}),
      ...Object.keys(isObject(after) ? after : {}),
    ]);
    return [...keys].flatMap(key =>
      changedFlags(
        node.additionalProperties,
        childOf(before, key),
        childOf(after, key),
        `${pointer}/${key}`
      )
    );
  }
  if (node.requiresRestart && JSON.stringify(before) !== JSON.stringify(after)) {
    return [{ pointer, title: node.title || pointer.split('/').pop(), reason: node.restartReason }];
  }
  return [];
};

const STEP_PATHS = {
  name: '/complete-onboarding/name',
  phone: '/complete-onboarding/phone-setup',
  password: '/complete-onboarding',
  email: '/complete-onboarding/email-verification',
};

const freshOnboarding = () => ({
  steps: ['name', 'phone', 'password', 'email', 'tfa', 'org'],
  done: [],
  account: { email: 'mark@m4kr.net', first_name: '', mobile_number: '' },
  purpose: 'verify',
  emailSent: false,
  tfaChoice: '',
  appVerified: false,
  smsEnrolled: false,
  accountType: '',
});

const state = {
  signedIn: false,
  pending: '',
  stepUpUntil: 0,
  tfa: { method: 'SMS', sent: false },
  onboarding: freshOnboarding(),
  profile: freshProfile(),
  organizations: freshOrganizations(),
  joinRequests: freshJoinRequests(),
  linkedAccounts: freshLinkedAccounts(),
  acceptedTerms: freshAcceptedTerms(),
  applications: freshApplications(),
  sessions: freshUserSessions(),
  tfaMethods: freshTfaMethods(),
  passkeys: freshPasskeys(),
  notifications: freshNotifications(),
  blocked: BRUTE_FORCE.blocked.map(row => ({ ...row })),
  terms: TERMS.map(row => ({ ...row })),
  configs: freshConfigs(),
  restart: {
    ...RESTART_STATUS,
    requires_restart: [{ pointer: '/server/port', title: 'Port', reason: BOUND }],
  },
  frontchannel: true,
  streams: new Set(),
  seq: 0,
};

const ok = (body, status = 200) => ({ status, body });

const noContent = () => ({ status: 204 });

const redirect = location => ({ status: 303, headers: { Location: location } });

const problem = (status, code, extra = {}, type = TYPES[status]) => ({
  status,
  problem: true,
  headers: extra.wait_seconds ? { 'Retry-After': String(extra.wait_seconds) } : {},
  body: { type: `${PROBS}${type}`, title: 'The request was refused.', status, code, ...extra },
});

const throttled = () => problem(429, 'throttled', { wait_seconds: WAIT_SECONDS });

const invalid = (pointer, rule, params = {}) =>
  problem(422, 'validation', {
    errors: [{ pointer, rule, params, detail: `${pointer} failed ${rule}` }],
  });

const codeProblem = code => {
  if (code === '000000') {
    return problem(403, 'invalid');
  }
  if (code === '111111') {
    return problem(403, 'expired');
  }
  if (code === '222222') {
    return problem(409, 'locked', { method: state.tfa.method }, 'method-locked');
  }
  if (code === '333333') {
    return throttled();
  }
  return null;
};

const emailProblem = email => {
  if (!EMAIL.test(String(email || ''))) {
    return invalid('/email', 'pattern', { pattern: 'email' });
  }
  if (String(email).startsWith('throttle')) {
    return throttled();
  }
  return null;
};

const passwordProblem = password => {
  if (String(password || '').length < 15) {
    return invalid('/password', 'minLength', { minLength: 15 });
  }
  return null;
};

const resetSession = () => {
  state.signedIn = false;
  state.pending = '';
  state.stepUpUntil = 0;
  state.tfa = { method: 'SMS', sent: false };
  state.onboarding = freshOnboarding();
};

const finishSignIn = () => {
  state.signedIn = true;
  state.pending = '';
};

const mockFlag = ctx => {
  const own = ctx.url.searchParams.get('mock');
  if (own) {
    return own;
  }
  const referer = ctx.req.headers.referer || '';
  try {
    return new URL(referer).searchParams.get('mock') || '';
  } catch {
    return '';
  }
};

const signIn = ctx => {
  const flag = mockFlag(ctx);
  if (flag === 'onboarding') {
    state.pending = 'onboarding';
    state.onboarding = freshOnboarding();
    return '/complete-onboarding';
  }
  if (flag === 'tfa') {
    state.pending = 'tfa';
    state.tfa = { method: 'SMS', sent: false };
    return '/authenticator';
  }
  finishSignIn();
  return '/';
};

const tfaState = method => ({
  method,
  target:
    method === 'APP'
      ? { id: 3, label: 'Phone' }
      : { id: 7, label: 'Work phone', masked: MASKED_PHONE },
  sent: state.tfa.sent,
  wait_seconds: 0,
  resend_after_seconds: 30,
  can_change_method: true,
});

const pendingStep = onboarding => onboarding.steps.find(step => !onboarding.done.includes(step));

const tfaNext = onboarding => {
  if (!onboarding.tfaChoice) {
    return '/complete-onboarding/choose-2fa-method';
  }
  if (onboarding.tfaChoice === 'APP' && !onboarding.appVerified) {
    return '/qrcode';
  }
  if (onboarding.tfaChoice === 'SMS' && !onboarding.smsEnrolled) {
    return '/complete-onboarding/phone-setup';
  }
  return '/complete-onboarding/backup-codes';
};

const orgNext = onboarding =>
  onboarding.accountType === 'team'
    ? '/complete-onboarding/team-name'
    : '/complete-onboarding/account-type';

const onboardingNext = onboarding => {
  const step = pendingStep(onboarding);
  if (!step) {
    return '/';
  }
  if (step === 'tfa') {
    return tfaNext(onboarding);
  }
  if (step === 'org') {
    return orgNext(onboarding);
  }
  return STEP_PATHS[step];
};

const onboardingState = () => {
  const { onboarding } = state;
  const phoneDone = onboarding.done.includes('phone') || onboarding.smsEnrolled;
  return {
    next: onboardingNext(onboarding),
    steps: onboarding.steps,
    done: onboarding.done,
    account: onboarding.account,
    phone: { purpose: onboarding.purpose, resend_after_seconds: 30, policies: [POLICY_LINKS[0]] },
    tfa: { sms_risk_notice: true, verified_phone: phoneDone ? MASKED_PHONE : null },
    org: { required_by_client: null },
  };
};

const advance = step => {
  const { onboarding } = state;
  if (step && !onboarding.done.includes(step)) {
    onboarding.done.push(step);
  }
  const next = onboardingNext(onboarding);
  if (!pendingStep(onboarding)) {
    finishSignIn();
  }
  return ok({ next });
};

const unreadCount = () => state.notifications.filter(row => !row.readAt).length;

const paged = (items, query) => {
  const page = Math.max(0, Number(query.get('page')) || 0);
  const size = Math.max(1, Number(query.get('size')) || 25);
  return {
    items: items.slice(page * size, page * size + size),
    page,
    size,
    total: items.length,
    total_pages: Math.ceil(items.length / size),
  };
};

const dayOf = instant => String(instant || '').slice(0, 10);

const withinRange = (instant, query) => {
  const day = dayOf(instant);
  const start = query.get('start_date') || '';
  const end = query.get('end_date') || '';
  return (start === '' || day >= start) && (end === '' || day <= end);
};

const nameMatches = (username, needle) =>
  !needle || username.toLowerCase().includes(String(needle).toLowerCase());

const LAST_ACTIVE = { 42: '2026-09-06', 43: '2026-05-01' };

const userMatches = (row, query) => {
  const search = String(query.get('search') || '').toLowerCase();
  const enabled = query.get('enabled') || '';
  const activeAfter = query.get('active_after') || '';
  return (
    (search === '' ||
      [row.username, row.full_name || '', row.customer_id || ''].some(text =>
        text.toLowerCase().includes(search)
      )) &&
    (enabled === '' || String(row.enabled) === enabled) &&
    (query.get('using_2fa') !== 'true' || row.using_2fa) &&
    (query.get('has_customer_id') !== 'true' || Boolean(row.customer_id)) &&
    (activeAfter === '' || (LAST_ACTIVE[row.id] || '') >= activeAfter)
  );
};

const searchRow = ({ kind, org, name, title, subtitle, matched }) => ({
  kind,
  collection: null,
  org,
  name,
  version: '',
  provider: '',
  architecture: '',
  title,
  subtitle,
  matched,
});

const searchOrganizations = needle => {
  const admin = state.profile.roles.includes('ROLE_ADMIN');
  const rows = admin ? ORGANIZATIONS : state.organizations;
  return rows
    .filter(org => org.name.toLowerCase().includes(needle))
    .map(org =>
      searchRow({
        kind: 'organization',
        org: org.name,
        name: org.name,
        title: org.name,
        subtitle: org.personal ? 'personal' : 'team',
        matched: 'name',
      })
    );
};

const searchUsers = needle => {
  if (!state.profile.roles.includes('ROLE_ADMIN')) {
    return [];
  }
  return USERS.items
    .filter(row => row.username.toLowerCase().includes(needle))
    .map(row =>
      searchRow({
        kind: 'user',
        org: '',
        name: row.username,
        title: row.full_name || row.username,
        subtitle: row.username,
        matched: 'username',
      })
    );
};

const isAdmin = () => state.profile.roles.includes('ROLE_ADMIN');

const has = (needle, ...texts) =>
  texts.some(text =>
    String(text || '')
      .toLowerCase()
      .includes(needle)
  );

const searchApplications = needle => {
  const rows = isAdmin() ? SERVICE_USAGE.items : state.applications;
  return rows
    .filter(app => has(needle, app.client_id, app.client_name))
    .map(app =>
      searchRow({
        kind: 'application',
        org: '',
        name: app.client_id,
        title: app.client_name,
        subtitle: app.client_id,
        matched: 'name',
      })
    );
};

const searchIdentityProviders = needle =>
  [...state.linkedAccounts.linked, ...state.linkedAccounts.available]
    .filter(provider => has(needle, provider.provider_name))
    .map(provider =>
      searchRow({
        kind: 'identity-provider',
        org: '',
        name: provider.provider_id,
        title: provider.provider_name,
        subtitle: provider.provider_id,
        matched: 'name',
      })
    );

const searchTerms = needle =>
  state.terms
    .filter(term => isAdmin() || term.is_public)
    .filter(term => has(needle, term.name, term.friendly_name, term.content))
    .map(term =>
      searchRow({
        kind: 'terms',
        org: '',
        name: term.name,
        title: term.friendly_name,
        subtitle: `v${term.version}`,
        matched: has(needle, term.name, term.friendly_name) ? 'name' : 'description',
      })
    );

const searchNotifications = needle =>
  state.notifications
    .filter(row => has(needle, row.title, row.body))
    .map(row =>
      searchRow({
        kind: 'notification',
        org: '',
        name: row.id,
        title: row.title,
        subtitle: row.body,
        matched: 'title',
      })
    );

const searchSessions = needle => {
  const rows = isAdmin() ? SESSIONS.items : state.sessions;
  return rows
    .filter(row => has(needle, row.client_name, row.user_agent, row.location))
    .map(row =>
      searchRow({
        kind: 'session',
        org: '',
        name: row.id,
        title: row.client_name,
        subtitle: `${row.user_agent} · ${row.location}`,
        matched: 'name',
      })
    );
};

const searchActivity = (kind, rows, needle) =>
  isAdmin()
    ? rows
        .filter(row => has(needle, row.username, row.city, row.country))
        .map(row =>
          searchRow({
            kind,
            org: '',
            name: row.username,
            title: row.username,
            subtitle: `${row.city}, ${row.country}`,
            matched: 'username',
          })
        )
    : [];

const searchBlocked = needle =>
  isAdmin()
    ? state.blocked
        .filter(row => has(needle, row.ip))
        .map(row =>
          searchRow({
            kind: 'blocked-address',
            org: '',
            name: row.ip,
            title: row.ip,
            subtitle: `${row.attempts} attempts`,
            matched: 'address',
          })
        )
    : [];

const search = query => {
  const needle = String(query.get('q') || '')
    .trim()
    .toLowerCase();
  const limit = Math.max(1, Number(query.get('limit')) || 5);
  if (!needle) {
    return { query: '', results: [], truncated: {} };
  }
  const results = [];
  const truncated = {};
  [
    searchOrganizations(needle),
    searchUsers(needle),
    searchApplications(needle),
    searchIdentityProviders(needle),
    searchTerms(needle),
    searchNotifications(needle),
    searchSessions(needle),
    searchActivity('login', LOGINS.items, needle),
    searchActivity('registration', REGISTRATIONS.items, needle),
    searchBlocked(needle),
  ].forEach(rows => {
    results.push(...rows.slice(0, limit));
    if (rows.length > limit) {
      truncated[rows[0].kind] = rows.length - limit;
    }
  });
  return { query: needle, results, truncated };
};

const nextId = () => {
  state.seq += 1;
  return `${Date.now()}-${state.seq}`;
};

const frame = (event, data) =>
  `id: ${nextId()}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const broadcast = (event, data) => {
  state.streams.forEach(res => res.write(frame(event, data)));
};

const endStreams = () => {
  broadcast('session-terminated', {});
  state.streams.forEach(res => res.end());
  state.streams.clear();
};

const recordRestart = flagged => {
  const kept = state.restart.requires_restart.filter(
    entry => !flagged.some(next => next.pointer === entry.pointer)
  );
  const pending = [...kept, ...flagged];
  state.restart = {
    restart_required: pending.length > 0,
    requires_restart: pending,
    last_modified_by: state.profile.email,
    last_modified_time: NOW(),
  };
  broadcast('restart-required', {
    required: state.restart.restart_required,
    last_modified_by: state.restart.last_modified_by,
    last_modified_time: state.restart.last_modified_time,
  });
};

const eventStream = ctx => {
  const { res } = ctx;
  const topics = (ctx.url.searchParams.get('topics') || '')
    .split(',')
    .filter(topic => STATUS.events.topics.includes(topic));
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
    'Set-Cookie': `XSRF-TOKEN=${XSRF}; Path=/; SameSite=Lax`,
  });
  const id = nextId();
  res.write(`retry: 3000\nid: ${id}\nevent: ready\ndata: ${JSON.stringify({ id, topics })}\n\n`);
  state.streams.add(res);
  const heartbeat = setInterval(() => res.write(':hb\n\n'), HEARTBEAT_MS);
  const burst = setTimeout(() => {
    res.write(frame('unread-count', { count: unreadCount() }));
    res.write(frame('blocked-count', { count: state.blocked.length }));
    res.write(
      frame('restart-required', {
        required: state.restart.restart_required,
        last_modified_by: state.restart.last_modified_by,
        last_modified_time: state.restart.last_modified_time,
      })
    );
    res.write(frame('health', health()));
  }, EVENTS_DELAY_MS);
  ctx.req.on('close', () => {
    clearInterval(heartbeat);
    clearTimeout(burst);
    state.streams.delete(res);
  });
  return null;
};

const routes = [];

const toRegex = pattern =>
  new RegExp(`^${pattern.replace(/:(?<name>[a-z_]+)/g, '(?<$<name>>[^/]+)')}$`);

const route = (method, pattern, handler, gate = {}) => {
  routes.push({ method, regex: toRegex(pattern), handler, gate });
};

const publicRoute = (method, pattern, handler) => route(method, pattern, handler);

const sessionRoute = (method, pattern, handler, extra = {}) =>
  route(method, pattern, handler, { session: true, ...extra });

const steppedRoute = (method, pattern, handler) =>
  sessionRoute(method, pattern, handler, { stepUp: true });

const adminRoute = (method, pattern, handler, extra = {}) =>
  sessionRoute(method, pattern, handler, { admin: true, ...extra });

const onboardingRoute = (method, pattern, handler) =>
  route(method, pattern, handler, { onboarding: true });

const tfaRoute = (method, pattern, handler) => route(method, pattern, handler, { tfa: true });

publicRoute('GET', '/api/status', () => ok(STATUS));
publicRoute('GET', '/api/health', () => ok(health()));
publicRoute('GET', '/api/rules', () => ok(RULES));
publicRoute('GET', '/api/auth/methods', () => ok(METHODS));
publicRoute('GET', '/api/public/site/branding', () => ok(BRANDING));
publicRoute('GET', '/api/public/geo/country', () => ok({ country_code: 'US' }));
publicRoute('GET', '/api/policies/:name', ctx => {
  const policy = POLICIES[ctx.params.name];
  return policy ? ok(policy) : problem(404, 'not_found');
});
publicRoute('POST', '/api/client-errors', ctx => {
  if (!Array.isArray(ctx.body.entries)) {
    return invalid('/entries', 'type', { type: 'array' });
  }
  ctx.body.entries.forEach(entry => {
    console.log(
      `client error ${entry.time} ${entry.level} [${entry.category}] ${entry.url}: ${entry.message}`
    );
  });
  return { status: 202 };
});
publicRoute('GET', '/api/events', ctx => {
  if (!state.signedIn && state.pending !== 'onboarding') {
    return problem(401, 'unauthenticated');
  }
  return eventStream(ctx);
});

publicRoute('POST', '/login', ctx => {
  const accept = String(ctx.req.headers.accept || '');
  if (!accept.includes('application/json')) {
    return redirect('/login?error=bad_credentials');
  }
  if (!ctx.body.username || !ctx.body.password) {
    return problem(401, 'bad_credentials', {}, 'authentication');
  }
  if (ctx.body.password === 'wrong') {
    return {
      ...problem(401, 'bad_credentials', {}, 'authentication'),
      headers: { 'WWW-Authenticate': 'FormBased realm="issuer"' },
    };
  }
  if (ctx.body.password === 'throttle') {
    return throttled();
  }
  return ok({ next: signIn(ctx) });
});
publicRoute('POST', '/login/magic/request', ctx => {
  if (!EMAIL.test(String(ctx.body.email || ''))) {
    return problem(400, 'bad_request', {
      errors: [{ pointer: '/email', rule: 'pattern', params: { pattern: 'email' } }],
    });
  }
  if (String(ctx.body.email).startsWith('throttle')) {
    return problem(429, 'quota', { wait_seconds: WAIT_SECONDS });
  }
  return ok({ sent: true }, 202);
});
publicRoute('POST', '/login/magic', ctx => {
  if (ctx.body.token === 'invalid') {
    return problem(403, 'magic_link_invalid');
  }
  if (ctx.body.token === 'disabled') {
    return problem(403, 'magic_link_account_disabled');
  }
  return ok({ next: signIn(ctx) });
});
publicRoute('POST', '/login/bootstrap', ctx => {
  if (ctx.body.token === 'invalid' || ctx.body.token === 'expired') {
    return problem(403, 'bootstrap_invalid');
  }
  if (ctx.body.token === 'disabled') {
    return problem(403, 'bootstrap_account_disabled');
  }
  if (String(ctx.body.email || '').startsWith('throttle')) {
    return throttled();
  }
  const next = signIn(ctx);
  const back = String(ctx.body.return || '');
  return ok({ next: next === '/' && SAFE_PATH.test(back) ? back : next });
});
publicRoute('POST', '/webauthn/authenticate/options', () =>
  ok({
    challenge: randomBytes(32).toString('base64url'),
    rpId: 'localhost',
    allowCredentials: [],
    userVerification: 'preferred',
    timeout: 60000,
  })
);
publicRoute('POST', '/login/webauthn', ctx => ok({ next: signIn(ctx) }));
publicRoute('GET', '/oauth2/authorization/:id', ctx => redirect(signIn(ctx)));
publicRoute('POST', '/auth-cancel', () => {
  resetSession();
  return ok({ next: '/' });
});
publicRoute(
  'POST',
  '/passwordRecovery',
  ctx => emailProblem(ctx.body.email) || ok({ sent: true }, 202)
);
publicRoute('POST', '/passwordReset', ctx => {
  if (ctx.body.token === 'invalid' || ctx.body.token === 'expired') {
    return problem(403, 'reset_invalid');
  }
  return passwordProblem(ctx.body.password) || ok({ next: '/login?reset=complete' });
});

tfaRoute('GET', '/api/auth/tfa', ctx => {
  const method = ctx.url.searchParams.get('method') || state.tfa.method;
  state.tfa.method = method;
  return ok(tfaState(method));
});
tfaRoute('POST', '/api/auth/tfa/send', () => {
  if (TFA_METHODS.locked.includes(state.tfa.method)) {
    return problem(409, 'locked', { method: state.tfa.method }, 'method-locked');
  }
  state.tfa.sent = true;
  return ok(tfaState(state.tfa.method));
});
tfaRoute('POST', '/authenticator', ctx => {
  const refused = codeProblem(String(ctx.body.code || ''));
  if (refused) {
    return refused;
  }
  finishSignIn();
  return ok({ next: '/' });
});
tfaRoute('POST', '/resend-tfa', () => {
  state.tfa.sent = true;
  return ok({ sent: true });
});
tfaRoute('GET', '/api/auth/tfa/methods', () => ok(TFA_METHODS));
tfaRoute('POST', '/authenticator-method', ctx => {
  const method = String(ctx.body.tfaMethod || 'APP');
  if (TFA_METHODS.locked.includes(method)) {
    return problem(409, 'locked', { method }, 'method-locked');
  }
  state.tfa = { method, sent: false };
  return ok(tfaState(method));
});

publicRoute(
  'POST',
  '/registration',
  ctx => emailProblem(ctx.body.email) || ok({ sent: true }, 202)
);
publicRoute('POST', '/registration/resend', ctx =>
  String(ctx.body.email || '').startsWith('throttle') ? throttled() : ok({ sent: true }, 202)
);
publicRoute('POST', '/registration/verify', ctx => {
  if (ctx.body.token === 'invalid' || ctx.body.token === 'expired') {
    return problem(403, 'link_invalid');
  }
  state.pending = 'onboarding';
  state.onboarding = freshOnboarding();
  return ok({ next: '/complete-onboarding' });
});

onboardingRoute('GET', '/api/auth/onboarding', () => ok(onboardingState()));
onboardingRoute('POST', '/complete-onboarding/name', ctx => {
  if (!String(ctx.body.given_name || '').trim()) {
    return invalid('/given_name', 'required');
  }
  state.onboarding.account.first_name = String(ctx.body.given_name);
  return advance('name');
});
onboardingRoute('POST', '/complete-onboarding/send-phone-code', ctx => {
  if (!String(ctx.body.mobile_number || '').startsWith('+')) {
    return invalid('/mobile_number', 'pattern', { pattern: 'e164' });
  }
  return ok({ sent: true }, 202);
});
onboardingRoute('POST', '/complete-onboarding/phone-setup', ctx => {
  const refused = codeProblem(String(ctx.body.code || ''));
  if (refused) {
    return refused;
  }
  state.onboarding.account.mobile_number = String(ctx.body.mobile_number || '');
  state.onboarding.smsEnrolled = true;
  return advance('phone');
});
onboardingRoute('POST', '/complete-onboarding/password', ctx => {
  const refused = passwordProblem(ctx.body.password);
  return refused || advance('password');
});
onboardingRoute('POST', '/complete-onboarding/email-verification', ctx => {
  if (!state.onboarding.emailSent) {
    return problem(401, 'session_expired');
  }
  const refused = codeProblem(String(ctx.body.code || ''));
  return refused || advance('email');
});
onboardingRoute('POST', '/complete-onboarding/email-verification/resend', () => {
  state.onboarding.emailSent = true;
  return ok({ resend_after_seconds: 30 });
});
onboardingRoute('POST', '/complete-onboarding/choose-2fa-method', ctx => {
  state.onboarding.tfaChoice = ctx.body.method === 'SMS' ? 'SMS' : 'APP';
  state.onboarding.purpose = 'tfa';
  return ok({ next: onboardingNext(state.onboarding) });
});
onboardingRoute('GET', '/api/auth/tfa/enroll', () => ok(ENROLL));
onboardingRoute('POST', '/qrcode/verify', ctx => {
  const refused = codeProblem(String(ctx.body.code || ''));
  if (refused) {
    return refused;
  }
  state.onboarding.appVerified = true;
  return ok({ next: onboardingNext(state.onboarding) });
});
onboardingRoute('POST', '/api/auth/tfa/backup-codes', () => ok({ codes: BACKUP_CODES }));
onboardingRoute('POST', '/complete-onboarding/backup-codes/confirm', () => advance('tfa'));
onboardingRoute('POST', '/complete-onboarding/account-type', ctx => {
  if (ctx.body.account_type === 'team') {
    state.onboarding.accountType = 'team';
    return ok({ next: '/complete-onboarding/team-name' });
  }
  state.onboarding.accountType = 'personal';
  return advance('org');
});
onboardingRoute('POST', '/complete-onboarding/team-name', ctx => {
  if (!String(ctx.body.team_name || '').trim()) {
    return invalid('/team_name', 'required');
  }
  return advance('org');
});

const acceptTerms = ctx => {
  const fields = ctx.body.fields || {};
  const missing = TERMS_STATE.fields.find(field => field.required && !fields[field.param]);
  if (missing) {
    return invalid(`/fields/${missing.param}`, 'required');
  }
  return ok({ next: '/' });
};

onboardingRoute('GET', '/api/auth/terms', () => ok(TERMS_STATE));
onboardingRoute('POST', '/oauth2/accept-terms', acceptTerms);
onboardingRoute('POST', '/provider-registration/tos/accept', acceptTerms);
publicRoute('GET', '/provider-registration/continue', () => redirect('/'));

sessionRoute('GET', '/api/auth/consent', ctx => ok(consent(ctx.url.searchParams)));
sessionRoute('POST', '/oauth2/authorize', ctx => {
  if (ctx.body.authorization_details_decision === 'deny' || !ctx.body.scope) {
    return redirect('/oauth2/code?error=access_denied&error_description=The+request+was+denied');
  }
  return redirect(`/oauth2/code?code=${randomBytes(8).toString('hex')}`);
});
publicRoute('POST', '/oauth2/device_verification', ctx => {
  const code = String(ctx.body.user_code || '').toUpperCase();
  if (ctx.body.scope || ctx.body.authorization_details_decision) {
    return redirect('/activated');
  }
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code) || code === 'XXXX-XXXX') {
    return redirect('/activate?error=invalid_user_code');
  }
  return redirect(`/oauth2/consent?client_id=conductor&state=abc123&user_code=${code}`);
});
sessionRoute('GET', '/api/auth/ciba', ctx => {
  const token = String(ctx.req.headers['x-ciba-token'] || '');
  if (!token || token === 'invalid') {
    return problem(404, 'not_found');
  }
  if (token === 'expired') {
    return problem(410, 'expired', {}, 'not-found');
  }
  if (token === 'other') {
    return problem(403, 'wrong_user');
  }
  return ok(CIBA);
});
sessionRoute('POST', '/ciba/approve', () => ok({ status: 'approved' }));
sessionRoute('POST', '/ciba/deny', () => ok({ status: 'denied' }));
sessionRoute('GET', '/api/auth/logout/confirm', () => ok(LOGOUT_CONFIRM));
sessionRoute('POST', '/connect/logout/confirm', ctx =>
  ok({ next: ctx.body.confirm === true ? '/connect/logout' : '/' })
);
publicRoute('GET', '/connect/logout', () => {
  resetSession();
  endStreams();
  state.frontchannel = true;
  return redirect('/connect/logout/frontchannel');
});
publicRoute('GET', '/api/auth/logout/frontchannel', () =>
  state.frontchannel ? ok(FRONTCHANNEL) : problem(404, 'not_found')
);
publicRoute('POST', '/api/auth/logout/frontchannel/done', () => {
  state.frontchannel = false;
  return noContent();
});
publicRoute('GET', '/api/auth/link', () => ok(LINK));
publicRoute('POST', '/link-account/confirm', ctx => {
  if (ctx.body.action === 'cancel') {
    return ok({ next: '/login?info=account_linking_declined' });
  }
  if (ctx.body.current_password === 'wrong') {
    return problem(403, 'bad_password');
  }
  if (ctx.body.current_password === 'throttle') {
    return problem(429, 'too_many_attempts', { wait_seconds: WAIT_SECONDS });
  }
  finishSignIn();
  return ok({ next: '/' });
});

publicRoute('POST', '/user/logout', () => {
  resetSession();
  endStreams();
  return ok({ next: '/login?logout' });
});
publicRoute('POST', '/org/invite', ctx => {
  const token = String(ctx.body.token || '');
  if (!token || token === 'invalid' || token === 'expired') {
    return problem(403, 'invite_invalid');
  }
  if (!state.signedIn) {
    return ok({ next: '/login' });
  }
  if (!state.organizations.some(org => org.uuid === 'p1')) {
    const record = organizationRecord('p1', 'Prominic', false);
    record.primary = false;
    record.my_role = 'MEMBER';
    record.can_manage = false;
    record.can_rename = false;
    record.is_owner = false;
    delete record.invite_code;
    state.organizations.push(record);
  }
  return ok({ next: '/user/organizations' });
});

publicRoute('GET', '/api/user', () => {
  if (state.signedIn) {
    return ok(state.profile);
  }
  if (state.pending === 'onboarding') {
    return problem(403, 'onboarding_required', { next: onboardingNext(state.onboarding) });
  }
  return problem(401, 'unauthenticated');
});
publicRoute('GET', '/api/user/avatar/:hash', () => ({
  status: 302,
  headers: { Location: '/brand/startcloud/icon.png' },
}));
sessionRoute('GET', '/api/userinfo/claims', () => ok(CLAIMS));
sessionRoute('GET', '/api/search', ctx => ok(search(ctx.url.searchParams)));
sessionRoute('GET', '/api/config/places', () => ok({ key: '' }));
sessionRoute('POST', '/api/user/step-up', ctx => {
  if (ctx.body.password === 'wrong' || codeProblem(String(ctx.body.code || ''))) {
    return problem(403, 'step_up_failed');
  }
  if (ctx.body.password === 'throttle') {
    return throttled();
  }
  state.stepUpUntil = Date.now() + STEP_UP_MS;
  return noContent();
});
sessionRoute('PATCH', '/api/user', ctx => {
  Object.assign(state.profile, ctx.body);
  state.profile.name =
    `${state.profile.given_name || ''} ${state.profile.family_name || ''}`.trim();
  return ok(state.profile);
});
sessionRoute('PUT', '/api/user/address', ctx => {
  state.profile.address = { ...ADDRESS, ...ctx.body };
  return ok(state.profile);
});
sessionRoute('POST', '/api/user/phone/send', ctx =>
  String(ctx.body.mobile_number || '').endsWith('0000') ? throttled() : ok({ sent: true }, 202)
);
steppedRoute('POST', '/api/user/phone/verify', ctx => {
  const refused = codeProblem(String(ctx.body.code || ''));
  if (refused) {
    return refused;
  }
  state.profile.mobile_number = {
    masked: `${String(ctx.body.mobile_number).slice(0, 2)} *** *** ${String(ctx.body.mobile_number).slice(-4)}`,
    verified: true,
  };
  return ok(state.profile);
});
steppedRoute('POST', '/api/user/email/request', ctx => {
  if (String(ctx.body.new_email || '').startsWith('taken')) {
    return problem(409, 'unique', {
      errors: [{ pointer: '/new_email', rule: 'unique', params: { scope: 'global' } }],
    });
  }
  return emailProblem(ctx.body.new_email) || ok({ sent: true }, 202);
});
sessionRoute('POST', '/api/user/email/verify', ctx => {
  const refused = codeProblem(String(ctx.body.code || ''));
  return refused || noContent();
});
steppedRoute('PUT', '/api/user/password', ctx => {
  if (ctx.body.current_password === 'wrong') {
    return problem(403, 'bad_password');
  }
  return passwordProblem(ctx.body.password) || noContent();
});
sessionRoute('GET', '/api/user/tfa/methods', () => ok(state.tfaMethods));
steppedRoute('GET', '/api/user/tfa/enroll', () => ok(ENROLL));
sessionRoute('POST', '/api/user/tfa/sms/send', ctx =>
  String(ctx.body.mobile_number || '').endsWith('0000') ? throttled() : ok({ sent: true }, 202)
);
steppedRoute('POST', '/api/user/tfa/sms/verify', ctx => {
  const refused = codeProblem(String(ctx.body.code || ''));
  if (refused) {
    return refused;
  }
  const id = Math.max(...state.tfaMethods.map(method => method.id)) + 1;
  const row = {
    id,
    type: 'SMS',
    label: ctx.body.label || 'Phone',
    display: MASKED_PHONE,
    enabled: true,
    preferred: false,
  };
  state.tfaMethods.push(row);
  return ok(row);
});
steppedRoute('POST', '/api/user/tfa/app/verify', ctx => {
  const refused = codeProblem(String(ctx.body.code || ''));
  if (refused) {
    return refused;
  }
  const id = Math.max(...state.tfaMethods.map(method => method.id)) + 1;
  const row = {
    id,
    type: 'APP',
    label: ctx.body.label || 'Authenticator',
    display: ctx.body.label || 'Authenticator',
    enabled: true,
    preferred: false,
  };
  state.tfaMethods.push(row);
  return ok(row);
});
steppedRoute('PUT', '/api/user/tfa/preferred', ctx => {
  state.tfaMethods.forEach(method => {
    method.preferred = ctx.body.authenticator_id
      ? method.id === Number(ctx.body.authenticator_id)
      : method.type === ctx.body.method;
  });
  return noContent();
});
steppedRoute('DELETE', '/api/user/tfa/methods/:id', ctx => {
  const remaining = state.tfaMethods.filter(method => method.type !== 'PASSKEY');
  if (remaining.length <= 1) {
    return problem(409, 'last_method');
  }
  state.tfaMethods = state.tfaMethods.filter(method => String(method.id) !== ctx.params.id);
  return noContent();
});
steppedRoute('PUT', '/api/user/tfa', ctx => {
  if (ctx.body.enabled && state.tfaMethods.length === 0) {
    return problem(409, 'no_methods');
  }
  state.profile.tfa.enabled = Boolean(ctx.body.enabled);
  return noContent();
});
sessionRoute('GET', '/api/user/passkeys', () => ok(state.passkeys));
steppedRoute('POST', '/webauthn/register/options', () =>
  ok({
    challenge: randomBytes(32).toString('base64url'),
    rp: { id: 'localhost', name: 'STARTcloud' },
    user: { id: UUID, name: 'mark@m4kr.net', displayName: 'Mark Gilbert' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    timeout: 60000,
  })
);
steppedRoute('POST', '/webauthn/register', ctx => {
  const id = Math.max(...state.passkeys.map(passkey => passkey.id), 0) + 1;
  const row = {
    id,
    label: ctx.body.label || 'Passkey',
    rp_id: 'localhost',
    created_at: NOW(),
    last_used_at: null,
  };
  state.passkeys.push(row);
  return ok(row);
});
sessionRoute('PATCH', '/api/user/passkeys/:id', ctx => {
  const passkey = state.passkeys.find(row => String(row.id) === ctx.params.id);
  if (!passkey) {
    return problem(404, 'not_found');
  }
  passkey.label = String(ctx.body.label || passkey.label);
  return ok(passkey);
});
steppedRoute('DELETE', '/api/user/passkeys/:id', ctx => {
  state.passkeys = state.passkeys.filter(row => String(row.id) !== ctx.params.id);
  return noContent();
});
sessionRoute('GET', '/api/user/backup-codes/count', () => ok({ remaining: 8 }));
steppedRoute('POST', '/api/user/backup-codes', () => ok({ codes: BACKUP_CODES }));
sessionRoute('GET', '/api/user/sessions', () => ok(state.sessions));
sessionRoute('DELETE', '/api/user/sessions/:id', ctx => {
  const row = state.sessions.find(entry => entry.id === ctx.params.id);
  state.sessions = state.sessions.filter(entry => entry.id !== ctx.params.id);
  if (row?.current) {
    resetSession();
    endStreams();
    return ok({ next: '/login' });
  }
  return noContent();
});
steppedRoute('DELETE', '/api/user/sessions', () => {
  state.sessions = [];
  resetSession();
  endStreams();
  return ok({ next: '/login' });
});
sessionRoute('GET', '/api/user/favorites', () =>
  ok([...state.profile.favorite_apps].sort(byOrder))
);
sessionRoute('PUT', '/api/user/favorites', ctx => {
  const list = Array.isArray(ctx.body) ? ctx.body : [];
  state.profile.favorite_apps = list
    .map((entry, index) => {
      const known = FAVORITES.find(app => app.client_id === entry.client_id);
      return {
        client_id: entry.client_id,
        client_name: known?.client_name || entry.client_id,
        icon_url: known?.icon_url || '',
        home_url: known?.home_url || '',
        custom_label: entry.custom_label || null,
        order: Number(entry.order ?? index),
      };
    })
    .sort(byOrder);
  return ok(state.profile.favorite_apps);
});
sessionRoute('PATCH', '/api/user/preferences', ctx => {
  const { ciba_user_code: pin, ...rest } = ctx.body;
  Object.assign(state.profile.preferences, rest);
  if (pin !== undefined) {
    state.profile.preferences.ciba_user_code_set = pin !== null && pin !== '';
  }
  return ok(state.profile);
});
sessionRoute('GET', '/api/user/preferences', () => ok(state.profile.preferences));
steppedRoute('POST', '/api/user/deletion', ctx => {
  if (ctx.body.email_confirmation !== state.profile.email) {
    return invalid('/email_confirmation', 'equals');
  }
  const teams = state.organizations
    .filter(org => !org.personal && org.is_owner && org.members.length > 1)
    .map(org => ({ uuid: org.uuid, name: org.name }));
  if (teams.length > 0) {
    return problem(409, 'sole_owner', { teams });
  }
  resetSession();
  endStreams();
  return ok({ next: '/login' });
});

const organizationOf = ctx => state.organizations.find(org => org.uuid === ctx.params.uuid);

sessionRoute('GET', '/api/user/organizations', () =>
  ok({
    organizations: state.organizations,
    organizations_enabled: true,
    personal_to_team_enabled: true,
  })
);
sessionRoute('POST', '/api/user/organizations', ctx => {
  if (!String(ctx.body.name || '').trim()) {
    return invalid('/name', 'required');
  }
  const record = organizationRecord(randomBytes(4).toString('hex'), String(ctx.body.name), false);
  record.primary = false;
  record.members = [MEMBERS[0]];
  record.pending_invites = [];
  state.organizations.push(record);
  return ok(record, 201);
});
sessionRoute('PATCH', '/api/user/organizations/:uuid', ctx => {
  const org = organizationOf(ctx);
  if (!org) {
    return problem(404, 'not_found');
  }
  Object.assign(org, ctx.body);
  return ok(org);
});
sessionRoute('POST', '/api/user/organizations/:uuid/convert', ctx => {
  const org = organizationOf(ctx);
  if (!org) {
    return problem(404, 'not_found');
  }
  org.personal = false;
  org.name = String(ctx.body.name || org.name);
  org.invite_code = 'INV-NEWTEAM1';
  return ok(org);
});
sessionRoute('POST', '/api/user/organizations/:uuid/invite-code', ctx => {
  const org = organizationOf(ctx);
  if (!org) {
    return problem(404, 'not_found');
  }
  org.invite_code = `INV-${randomBytes(4).toString('hex').toUpperCase()}`;
  return ok(org);
});
sessionRoute('POST', '/api/user/organizations/:uuid/invites', ctx => {
  const org = organizationOf(ctx);
  if (!org) {
    return problem(404, 'not_found');
  }
  const refused = emailProblem(ctx.body.email);
  if (refused) {
    return refused;
  }
  const id = Math.max(...org.pending_invites.map(invite => invite.id), 0) + 1;
  org.pending_invites.push({ id, email: String(ctx.body.email), role: ctx.body.role || 'MEMBER' });
  return ok(org, 201);
});
sessionRoute('DELETE', '/api/user/organizations/:uuid/invites/:id', ctx => {
  const org = organizationOf(ctx);
  if (!org) {
    return problem(404, 'not_found');
  }
  org.pending_invites = org.pending_invites.filter(invite => String(invite.id) !== ctx.params.id);
  return noContent();
});
sessionRoute('PUT', '/api/user/organizations/:uuid/members/:user_id/role', ctx => {
  const org = organizationOf(ctx);
  const member = org?.members.find(row => String(row.user_id) === ctx.params.user_id);
  if (!member) {
    return problem(404, 'not_found');
  }
  const owners = org.members.filter(row => row.role === 'OWNER');
  if (member.role === 'OWNER' && ctx.body.role !== 'OWNER' && owners.length === 1) {
    return problem(409, 'last_owner');
  }
  member.role = String(ctx.body.role || member.role);
  return ok(org);
});
sessionRoute('DELETE', '/api/user/organizations/:uuid/members/:user_id', ctx => {
  const org = organizationOf(ctx);
  if (!org) {
    return problem(404, 'not_found');
  }
  org.members = org.members.filter(row => String(row.user_id) !== ctx.params.user_id);
  return noContent();
});
sessionRoute('POST', '/api/user/organizations/:uuid/leave', ctx => {
  state.organizations = state.organizations.filter(org => org.uuid !== ctx.params.uuid);
  return noContent();
});
sessionRoute('DELETE', '/api/user/organizations/:uuid', ctx => {
  state.organizations = state.organizations.filter(org => org.uuid !== ctx.params.uuid);
  return noContent();
});
sessionRoute('PUT', '/api/user/primary-organization', ctx => {
  state.organizations.forEach(org => {
    org.primary = org.uuid === ctx.body.uuid;
  });
  state.profile.organizations.forEach(org => {
    org.primary = org.uuid === ctx.body.uuid;
  });
  return noContent();
});
sessionRoute('GET', '/api/organizations/discover', () =>
  ok(
    [...state.organizations, ...DIRECTORY]
      .filter(org => ['invite', 'request'].includes(org.access_mode) || isAdmin())
      .map(directoryRow)
  )
);

const listedOrganization = uuid =>
  state.organizations.find(org => org.uuid === uuid) || DIRECTORY.find(org => org.uuid === uuid);

const managedOrganization = ctx => {
  const org = state.organizations.find(entry => entry.uuid === ctx.params.org);
  if (!org) {
    return { refused: problem(404, 'not_found') };
  }
  if (!org.can_manage) {
    return { refused: problem(403, 'insufficient_role') };
  }
  return { org };
};

sessionRoute('POST', '/api/organization/:org/requests', ctx => {
  const org = listedOrganization(ctx.params.org);
  if (!org) {
    return problem(404, 'not_found');
  }
  const message = String(ctx.body.message || '') || null;
  if (message && message.length > 1000) {
    return invalid('/message', 'maxLength', { maxLength: 1000 });
  }
  if (state.organizations.some(entry => entry.uuid === org.uuid)) {
    return problem(409, 'already_member');
  }
  if (org.access_mode !== 'request') {
    return problem(403, 'not_open');
  }
  if (state.joinRequests.some(row => row.org === org.uuid && row.user.id === state.profile.id)) {
    return problem(409, 'already_requested');
  }
  const row = {
    id: Math.max(...state.joinRequests.map(entry => entry.id), 0) + 1,
    org: org.uuid,
    user: { id: state.profile.id, name: state.profile.name, email: state.profile.email },
    message,
    created_at: NOW(),
  };
  state.joinRequests.push(row);
  return ok(requestEntry(row), 201);
});
sessionRoute('GET', '/api/organization/:org/requests', ctx => {
  const { org, refused } = managedOrganization(ctx);
  if (refused) {
    return refused;
  }
  return ok(state.joinRequests.filter(row => row.org === org.uuid).map(requestEntry));
});
sessionRoute('POST', '/api/organization/:org/requests/:id/approve', ctx => {
  const { org, refused } = managedOrganization(ctx);
  if (refused) {
    return refused;
  }
  const row = state.joinRequests.find(
    entry => entry.org === org.uuid && String(entry.id) === ctx.params.id
  );
  if (!row) {
    return problem(404, 'not_found');
  }
  const role =
    ctx.body.assigned_role === undefined
      ? org.default_role
      : String(ctx.body.assigned_role).toUpperCase();
  if (!['MEMBER', 'ADMIN'].includes(role)) {
    return invalid('/assigned_role', 'enum', { enum: ['MEMBER', 'ADMIN'] });
  }
  org.members.push({
    user_id: row.user.id,
    email: row.user.email,
    name: row.user.name,
    role,
    managed_by: null,
  });
  state.joinRequests = state.joinRequests.filter(entry => entry !== row);
  return noContent();
});
sessionRoute('POST', '/api/organization/:org/requests/:id/deny', ctx => {
  const { org, refused } = managedOrganization(ctx);
  if (refused) {
    return refused;
  }
  const before = state.joinRequests.length;
  state.joinRequests = state.joinRequests.filter(
    entry => !(entry.org === org.uuid && String(entry.id) === ctx.params.id)
  );
  return state.joinRequests.length === before ? problem(404, 'not_found') : noContent();
});

sessionRoute('GET', '/api/user/linked-accounts', () => ok(state.linkedAccounts));
sessionRoute('GET', '/api/user/terms', () => ok(state.acceptedTerms));
sessionRoute('GET', '/api/user/applications', () => ok(state.applications));
sessionRoute('GET', '/api/user/integrations', () => ok({}));
sessionRoute('GET', '/api/user/integrations/providers/:id/status', ctx =>
  ok({ status: ctx.params.id === 'github' ? 'valid' : 'unknown' })
);
steppedRoute('POST', '/api/user/integrations/providers/:id/link', ctx =>
  ok({ next: `/user/profile/security?linked=${ctx.params.id}` })
);
steppedRoute('DELETE', '/api/user/integrations/providers/:id', ctx => {
  if (state.linkedAccounts.linked.length <= 1 && !state.profile.has_local_auth) {
    return problem(409, 'last_login_method');
  }
  state.linkedAccounts.linked = state.linkedAccounts.linked.filter(
    row => row.provider_id !== ctx.params.id
  );
  return noContent();
});
steppedRoute('DELETE', '/api/user/integrations/apps/:client_id', ctx => {
  state.applications = state.applications.filter(row => row.client_id !== ctx.params.client_id);
  return noContent();
});
sessionRoute('DELETE', '/api/user/integrations/apps/:client_id/scopes/:scope', ctx => {
  if (ctx.params.scope === 'openid') {
    return problem(403, 'openid_required');
  }
  const app = state.applications.find(row => row.client_id === ctx.params.client_id);
  if (app) {
    app.consent_scopes = app.consent_scopes.filter(scope => scope !== ctx.params.scope);
  }
  return noContent();
});

sessionRoute('GET', '/api/notifications', ctx => {
  const unreadOnly = ['true', '1'].includes(
    ctx.url.searchParams.get('unread_only') || ctx.url.searchParams.get('unreadOnly') || ''
  );
  const rows = unreadOnly ? state.notifications.filter(row => !row.readAt) : state.notifications;
  return ok(paged(rows, ctx.url.searchParams));
});
sessionRoute('GET', '/api/notifications/unread-count', () => ok({ count: unreadCount() }));
sessionRoute('GET', '/api/notifications/vapid-key', () =>
  ok({
    publicKey:
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
  })
);
sessionRoute('POST', '/api/notifications/subscriptions', () => ({ status: 201 }));
sessionRoute('DELETE', '/api/notifications/subscriptions', () => noContent());
sessionRoute('POST', '/api/notifications/test/toast', () => ok({ sent: true }));
sessionRoute('POST', '/api/notifications/test/channel', () => {
  state.notifications.unshift({
    id: `n${Date.now()}`,
    type: 'MESSAGE',
    severity: 'INFO',
    title: 'Test notification',
    body: 'Sent from the mock issuer.',
    navigate: '',
    readAt: null,
    createdAt: NOW(),
  });
  broadcast('unread-count', { count: unreadCount() });
  return ok({ sent: true });
});
sessionRoute('POST', '/api/notifications/:id/read', ctx => {
  const row = state.notifications.find(entry => entry.id === ctx.params.id);
  if (row && !row.readAt) {
    row.readAt = NOW();
  }
  broadcast('unread-count', { count: unreadCount() });
  return noContent();
});
sessionRoute('POST', '/api/notifications/read-all', () => {
  state.notifications.forEach(row => {
    row.readAt ||= NOW();
  });
  broadcast('unread-count', { count: 0 });
  return noContent();
});
sessionRoute('DELETE', '/api/notifications/:id', ctx => {
  state.notifications = state.notifications.filter(row => row.id !== ctx.params.id);
  broadcast('unread-count', { count: unreadCount() });
  return noContent();
});
sessionRoute('DELETE', '/api/notifications', () => {
  state.notifications = [];
  broadcast('unread-count', { count: 0 });
  return noContent();
});

adminRoute('GET', '/api/admin/stats', () => ok(STATS));
adminRoute('GET', '/api/admin/login-heatmap', () => ok(HEATMAP));
adminRoute('GET', '/api/admin/logins', ctx => {
  const query = ctx.url.searchParams;
  const success = query.get('success') || '';
  const rows = LOGINS.items.filter(
    row =>
      withinRange(row.timestamp, query) &&
      nameMatches(row.username, query.get('username')) &&
      (success === '' || String(row.success) === success)
  );
  return ok(paged(rows, query));
});
adminRoute('GET', '/api/admin/registrations', ctx => {
  const query = ctx.url.searchParams;
  const rows = REGISTRATIONS.items.filter(
    row => withinRange(row.timestamp, query) && nameMatches(row.username, query.get('username'))
  );
  return ok(paged(rows, query));
});
adminRoute('GET', '/api/admin/sessions', () => ok(SESSIONS));
adminRoute('DELETE', '/api/admin/sessions/:id', () => noContent());
adminRoute('GET', '/api/admin/users', ctx => {
  const query = ctx.url.searchParams;
  const rows = USERS.items.filter(row => userMatches(row, query));
  return ok(paged(rows, query));
});
adminRoute('GET', '/api/admin/roles', () => ok(ROLES));
adminRoute('PATCH', '/api/admin/users/:id', ctx => {
  const user = USERS.items.find(row => String(row.id) === ctx.params.id);
  if (!user) {
    return problem(404, 'not_found');
  }
  if (ctx.body.customer_id !== undefined && !/^(?:[0-9A-F]{6})?$/.test(ctx.body.customer_id)) {
    return invalid('/customer_id', 'pattern', { pattern: 'orgCode' });
  }
  Object.assign(user, ctx.body);
  return ok(user);
});
adminRoute('PUT', '/api/admin/users/:id/roles', ctx => {
  const user = USERS.items.find(row => String(row.id) === ctx.params.id);
  if (!user) {
    return problem(404, 'not_found');
  }
  const unknown = (ctx.body.roles || []).find(role => !ROLES.includes(role));
  if (unknown) {
    return invalid('/roles', 'enum', { enum: ROLES });
  }
  if (user.id === 42 && !ctx.body.roles.includes('ROLE_ADMIN')) {
    return problem(403, 'own_privileged_role');
  }
  user.roles = [...ctx.body.roles];
  return ok(user);
});
adminRoute('DELETE', '/api/admin/users/:id', () => noContent(), { stepUp: true });
adminRoute('POST', '/api/admin/users/bulk', ctx => {
  if (ctx.body.action === 'delete' && Date.now() > state.stepUpUntil) {
    return problem(403, 'step_up_required');
  }
  const ids = Array.isArray(ctx.body.user_ids) ? ctx.body.user_ids : [];
  return ok({ processed: ids.length, skipped: 0, errors: [] });
});
adminRoute('GET', '/api/admin/organizations', () => ok(ORGANIZATIONS));
adminRoute('PATCH', '/api/admin/organizations/:id', ctx => {
  const org = ORGANIZATIONS.find(row => String(row.id) === ctx.params.id);
  if (!org) {
    return problem(404, 'not_found');
  }
  const name = String(ctx.body.name ?? org.name);
  if (ORGANIZATIONS.some(row => row !== org && row.name === name)) {
    return problem(409, 'unique', {
      errors: [{ pointer: '/name', rule: 'unique', params: { scope: 'global' } }],
    });
  }
  if (ctx.body.customer_id !== undefined && !/^(?:[0-9A-F]{6})?$/.test(ctx.body.customer_id)) {
    return invalid('/customer_id', 'pattern', { pattern: 'orgCode' });
  }
  Object.assign(org, ctx.body);
  return ok(org);
});
adminRoute('DELETE', '/api/admin/organizations/:id', ctx => {
  const org = ORGANIZATIONS.find(row => String(row.id) === ctx.params.id);
  if (org?.personal && org.member_count > 0) {
    return problem(409, 'personal_organization');
  }
  return noContent();
});
adminRoute('GET', '/api/admin/service-usage', () => ok(SERVICE_USAGE));
adminRoute('GET', '/api/admin/insights', () => ok(INSIGHTS));
adminRoute('GET', '/api/admin/client-health', () => ok(CLIENT_HEALTH));
adminRoute('GET', '/api/admin/brute-force', () =>
  ok({ enabled: BRUTE_FORCE.enabled, blocked: state.blocked })
);
adminRoute('GET', '/api/admin/brute-force/count', () => ok({ count: state.blocked.length }));
adminRoute('DELETE', '/api/admin/brute-force/:ip', ctx => {
  state.blocked = state.blocked.filter(row => row.ip !== ctx.params.ip);
  broadcast('blocked-count', { count: state.blocked.length });
  return noContent();
});
adminRoute('GET', '/api/admin/rate-limit/banned', () => ok([43]));
adminRoute('GET', '/api/admin/rate-limit/:user_id', () => ok(RATE_LIMIT));
adminRoute('POST', '/api/admin/rate-limit/:user_id/unlock', () => noContent());
adminRoute('POST', '/api/admin/rate-limit/:user_id/tfa-unlock', ctx =>
  ['SMS', 'APP', 'BACKUP_CODE'].includes(ctx.body.method)
    ? noContent()
    : invalid('/method', 'enum', { enum: ['SMS', 'APP', 'BACKUP_CODE'] })
);
adminRoute('POST', '/api/admin/rate-limit/:user_id/ban', () => noContent());
adminRoute('POST', '/api/admin/rate-limit/:user_id/unban', () => noContent());
adminRoute('GET', '/api/admin/terms', () => ok(state.terms));
adminRoute('GET', '/api/admin/terms/placeholders', () => ok(PLACEHOLDERS));
adminRoute('POST', '/api/admin/terms', ctx => {
  if (state.terms.some(row => row.name === ctx.body.name)) {
    return problem(409, 'unique', {
      errors: [{ pointer: '/name', rule: 'unique', params: { scope: 'global' } }],
    });
  }
  const row = { created_by: 'mark@m4kr.net', updated_at: NOW(), ...ctx.body };
  state.terms.push(row);
  return ok(row, 201);
});
adminRoute('PUT', '/api/admin/terms/order', ctx => {
  const names = Array.isArray(ctx.body.names) ? ctx.body.names : [];
  state.terms.forEach(row => {
    const index = names.indexOf(row.name);
    if (index >= 0) {
      row.display_order = (index + 1) * 10;
    }
  });
  state.terms.sort((first, second) => first.display_order - second.display_order);
  return noContent();
});
adminRoute('PATCH', '/api/admin/terms/:name', ctx => {
  const row = state.terms.find(term => term.name === ctx.params.name);
  if (!row) {
    return problem(404, 'not_found');
  }
  Object.assign(row, ctx.body, { updated_at: NOW() });
  return ok(row);
});
adminRoute('DELETE', '/api/admin/terms/:name', ctx => {
  state.terms = state.terms.filter(term => term.name !== ctx.params.name);
  return noContent();
});
adminRoute('GET', '/api/admin/dcr/clients', () => ok([]));
adminRoute('DELETE', '/api/admin/dcr/clients/:id', () => noContent());
adminRoute('GET', '/api/config/restart-status', () => ok(state.restart));
adminRoute('GET', '/api/config/:name', ctx => {
  const file = state.configs[ctx.params.name];
  return file ? ok(file) : problem(404, 'not_found');
});
adminRoute('GET', '/api/config/:name/schema', ctx => {
  const schema = CONFIG_SCHEMAS[ctx.params.name];
  return schema ? ok(schema) : problem(404, 'not_found');
});
adminRoute('PUT', '/api/config/:name', ctx => {
  const { name } = ctx.params;
  const schema = CONFIG_SCHEMAS[name];
  if (!schema) {
    return problem(404, 'not_found');
  }
  const before = state.configs[name];
  const after = mergePatch(before, ctx.body);
  const flagged = changedFlags(schema, before, after);
  state.configs[name] = after;
  recordRestart(flagged);
  return ok({ message: 'Configuration saved.', requires_restart: flagged });
});
adminRoute(
  'POST',
  '/api/config/restart',
  () => {
    state.restart = {
      restart_required: false,
      requires_restart: [],
      last_modified_by: null,
      last_modified_time: null,
    };
    broadcast('restart-required', {
      required: false,
      last_modified_by: null,
      last_modified_time: null,
    });
    return ok({ message: 'Restarting.' }, 202);
  },
  { stepUp: true }
);
adminRoute('POST', '/api/mail/test-smtp', () => ok({ message: 'Sent.' }));
adminRoute('GET', '/api/admin/config/schema', () => ok(ADMIN_CONFIG.schema));
adminRoute('GET', '/api/admin/config/values', () => ok(ADMIN_CONFIG.values));
adminRoute('GET', '/api/admin/config/base-defaults', () => ok(ADMIN_CONFIG.baseDefaults));
adminRoute('GET', '/api/admin/config/restart-status', () => ok(state.restart));
adminRoute('PUT', '/api/admin/config/values', ctx => {
  ADMIN_CONFIG.values = ctx.body || {};
  state.restart = {
    restart_required: true,
    last_modified_by: 'mark@m4kr.net',
    last_modified_time: NOW(),
  };
  broadcast('restart-required', {
    required: true,
    last_modified_by: state.restart.last_modified_by,
    last_modified_time: state.restart.last_modified_time,
  });
  return noContent();
});
adminRoute(
  'POST',
  '/api/admin/config/restart',
  () => {
    state.restart = { restart_required: false, last_modified_by: null, last_modified_time: null };
    broadcast('restart-required', { required: false });
    return noContent();
  },
  { stepUp: true }
);
adminRoute(
  'POST',
  '/api/admin/config/rotate-signing-key',
  () => ok({ kid: randomBytes(8).toString('hex') }),
  { stepUp: true }
);
adminRoute('POST', '/api/admin/config/test-smtp', () => ok({ sent: true }));
adminRoute('GET', '/api/admin/errors/:reference', ctx =>
  /^[0-9a-f]{16}$/.test(ctx.params.reference)
    ? ok(ERROR_DETAILS(ctx.params.reference))
    : problem(404, 'not_found')
);
adminRoute('GET', '/api/admin/export/:name', ctx => {
  const files = { logins: LOGINS.items, registrations: REGISTRATIONS.items, users: USERS.items };
  const rows = files[ctx.params.name];
  if (!rows) {
    return problem(404, 'not_found');
  }
  return {
    status: 200,
    body: rows,
    headers: { 'Content-Disposition': `attachment; filename="${ctx.params.name}.json"` },
  };
});

const readBody = req =>
  new Promise(resolve => {
    let text = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      text += chunk;
    });
    req.on('end', () => resolve(text));
  });

const parseBody = (req, text) => {
  const type = String(req.headers['content-type'] || '');
  if (type.includes('json')) {
    try {
      return JSON.parse(text || 'null') ?? {};
    } catch {
      return {};
    }
  }
  if (type.includes('x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(text));
  }
  return {};
};

const match = (method, pathname) => {
  for (const entry of routes) {
    if (entry.method === method) {
      const found = entry.regex.exec(pathname);
      if (found) {
        return { entry, params: found.groups || {} };
      }
    }
  }
  return null;
};

const csrfRefused = (req, body) => {
  if (SAFE_METHODS.includes(req.method)) {
    return false;
  }
  const header = String(req.headers['x-xsrf-token'] || '');
  return header !== XSRF && body._csrf !== XSRF;
};

const gateRefusal = gate => {
  if (gate.onboarding && !state.signedIn && state.pending !== 'onboarding') {
    return problem(401, 'session_expired');
  }
  if (gate.tfa && !state.signedIn && state.pending !== 'tfa') {
    return problem(401, 'session_expired');
  }
  if ((gate.session || gate.admin) && !state.signedIn) {
    if (state.pending === 'onboarding') {
      return problem(403, 'onboarding_required', { next: onboardingNext(state.onboarding) });
    }
    return problem(401, 'unauthenticated');
  }
  if (gate.admin && !state.profile.roles.includes('ROLE_ADMIN')) {
    return problem(403, 'forbidden');
  }
  if (gate.stepUp && Date.now() > state.stepUpUntil) {
    return problem(403, 'step_up_required');
  }
  return null;
};

const send = (req, res, answer) => {
  const headers = {
    'Set-Cookie': `XSRF-TOKEN=${XSRF}; Path=/; SameSite=Lax`,
    ...(req.url.startsWith('/api') ? { 'Cache-Control': 'no-store' } : {}),
    ...(answer.headers || {}),
  };
  if (answer.body === undefined) {
    res.writeHead(answer.status, headers);
    res.end();
    return;
  }
  const contentType = answer.problem ? 'application/problem+json' : 'application/json';
  res.writeHead(answer.status, { 'Content-Type': contentType, Vary: 'Accept', ...headers });
  res.end(JSON.stringify(answer.body));
};

const handle = async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const text = await readBody(req);
  const body = parseBody(req, text);
  const found = match(req.method, url.pathname);
  if (!found) {
    send(req, res, problem(404, 'not_found'));
    return;
  }
  if (csrfRefused(req, body)) {
    send(req, res, problem(403, 'csrf'));
    return;
  }
  const refused = gateRefusal(found.entry.gate);
  if (refused) {
    send(req, res, refused);
    return;
  }
  const answer = found.entry.handler({ req, res, url, body, params: found.params });
  if (answer) {
    send(req, res, answer);
  }
};

/**
 * A development-only mock of the authorization server so the shared UI
 * can be clicked through before the real server answers: every route of
 * the identity, events, navbar, validation and branding contracts answered
 * with the contracts' example payloads, one in-memory session, the
 * `XSRF-TOKEN` cookie on every answer and `X-XSRF-TOKEN` (or the `_csrf`
 * form field) required on every unsafe method.
 *
 * Run it inside WSL with `npm run mock` (the port is `PORT`, 3443 by
 * default) and point the dev proxy at it in config.yaml:
 *
 *     server:
 *       api_target: http://localhost:3443
 *       auth_target: http://localhost:3443
 *
 * Sign in with any username and any password; the password `wrong`
 * answers `401 bad_credentials`, `throttle` answers `429` with
 * `wait_seconds`. Open `/login?mock=onboarding` to enter the onboarding
 * chain after sign-in and `/login?mock=tfa` to enter `/authenticator`.
 * The users, logins and registrations lists honor the navbar panel's
 * parameters (`search`, `enabled`, `using_2fa`, `has_customer_id`,
 * `active_after`; `username`, `success`, `start_date`, `end_date`) and
 * `page` and `size`. `GET /api/search?q=&limit=` answers, in the navbar
 * contract's row shape, every kind of the identity contract's search
 * table from the fixtures: organizations over the person's memberships
 * (every organization for an admin), users, logins, registrations and
 * blocked addresses for an admin, applications, identity providers, terms,
 * notifications and sessions under the same visibility as their pages.
 * The four reads of decision 123 answer their row shapes:
 * `GET /api/user/linked-accounts`, `GET /api/user/terms` and
 * `GET /api/user/applications` from the fixtures, and
 * `GET /api/user/integrations` answers `{}` with no `services`, so the
 * Integrations entry and page stay absent as on an issuer that connects
 * no third-party service.
 * Every code entry accepts any six digits except `000000` (invalid),
 * `111111` (expired), `222222` (locked) and `333333` (throttled); a token
 * of `invalid` or `expired` refuses a magic, bootstrap, verification,
 * reset or invitation link, and `disabled` answers the disabled-account
 * code on the magic and bootstrap links;
 * an address starting with `throttle` is throttled, one starting with
 * `taken` is already taken on the email change; a current password of
 * `wrong` fails the step-up and the password change. The first sensitive
 * call answers `403 step_up_required` until `POST /api/user/step-up`
 * arms the five-minute window. `GET /api/events` streams `ready`, one
 * `unread-count`, `blocked-count`, `restart-required` and `health` event
 * three seconds after connecting, and `:hb` every 25 seconds. The six
 * configuration files `status.config` names are answered in the config
 * contract's shapes over in-memory fixtures: `GET /api/config/<name>` the
 * raw file, `GET /api/config/<name>/schema` its schema, `PUT` a JSON Merge
 * Patch answering `requires_restart` as the diff of the flagged leaves,
 * `GET /api/config/restart-status` the pending union and
 * `POST /api/config/restart`, stepped up, `202` clearing it; the mail
 * section's test action posts `/api/mail/test-smtp`. The directory of
 * decision 124 is answered from the memberships and three fixtures a
 * person is not a member of, `GET /api/organizations/discover`, and the
 * join requests live in memory: `POST /api/organization/{uuid}/requests`
 * files one on a `request` organization (`409 already_member` on a
 * membership, `403 not_open` elsewhere, `409 already_requested` twice),
 * `GET …/requests` lists a managed organization's, and `…/approve` makes
 * the membership at `assigned_role` while `…/deny` drops the request.
 *
 * @returns {http.Server} The listening server
 */
export const startMockIssuer = () => {
  const server = http.createServer((req, res) => {
    handle(req, res).catch(error => {
      console.error(error);
      send(req, res, problem(500, 'internal'));
    });
  });
  server.listen(PORT, () => {
    console.log(`mock issuer listening on http://localhost:${PORT}`);
  });
  return server;
};

startMockIssuer();
