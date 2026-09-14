import { randomBytes } from 'crypto';
import http from 'http';
import process from 'process';

// THIS FILE IS GOING TO BEREMOVED, DO NOT ATTEMPT TO UPDATE WITHOUT MARK EXPLICTY SAYING TO UPDATE THE MOCK

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
    region: { type: 'string', pattern: '^[A-Z]{2}$|^(EU|EEA|UK)$' },
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
        regions: { type: 'array', items: { $ref: '#/$defs/region' } },
        friendly_name: { type: 'string', minLength: 1, maxLength: 255 },
        icon: { $ref: '#/$defs/icon' },
        version: { type: 'string', minLength: 1, maxLength: 32 },
        type: { type: 'string', enum: ['site', 'client'] },
        is_public: { type: 'boolean' },
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

const TERMS_REGIONS = ['EU', 'UK', null];

const TERMS_VERSIONS = [
  { version: '2025.3', published_at: '2026-08-30T14:02:11Z' },
  { version: '2025.2', published_at: '2025-11-04T09:15:00Z' },
];

const TERMS_PREVIOUS = { version: '2025.2', accepted_at: '2025-12-02T18:40:09Z' };

const TERMS_CHANGES_HTML =
  '<h1>HCL Master License Agreement</h1>\n<p>Version 2025.3, effective <ins>September 12, 2026</ins><del>November 4, 2025</del>.</p>\n<p>This Master License Agreement is entered into between HCL Technologies Limited and the licensee named below for the use of HCL Nomad through SwitchBoard Desktop, provided by STARTcloud.</p>\n<p><strong>Licensee:</strong> Mark Gilbert (mark@example.com)</p>\n<p><strong>Telephone:</strong> <span class="tos-blank" data-tos-field="phone_number">________</span></p>\n<p><strong>Address:</strong> <span class="tos-blank" data-tos-field="address">________</span></p>\n';

const TERMS_OLD_CONTENT_HTML =
  '<h1>HCL Master License Agreement</h1>\n<p>Version 2025.2, effective November 4, 2025.</p>\n<p>This Master License Agreement is entered into between HCL Technologies Limited and the licensee named below for the use of HCL Nomad through SwitchBoard Desktop, provided by STARTcloud.</p>\n';

const TERMS_STATE = {
  name: 'hcl-mla',
  label: 'HCL Master License Agreement',
  version: '2025.3',
  region: null,
  regions_offered: TERMS_REGIONS,
  scope: 'client',
  step: 2,
  total: 2,
  client_name: 'SwitchBoard Desktop',
  collecting: true,
  content_html:
    '<h1>HCL Master License Agreement</h1>\n<p>Version 2025.3, effective September 12, 2026.</p>\n<p>This Master License Agreement is entered into between HCL Technologies Limited and the licensee named below for the use of HCL Nomad through SwitchBoard Desktop, provided by STARTcloud.</p>\n<p><strong>Licensee:</strong> Mark Gilbert (mark@example.com)</p>\n<p><strong>Telephone:</strong> <span class="tos-blank" data-tos-field="phone_number">________</span></p>\n<p><strong>Address:</strong> <span class="tos-blank" data-tos-field="address">________</span></p>\n',
  content_middle_html:
    '<h2>1. Grant of license</h2><p>HCL grants the licensee a non-exclusive, non-transferable license to use HCL Nomad through SwitchBoard Desktop for the term of the subscription.</p><h2>2. Restrictions</h2><p>The licensee shall not sublicense, resell or reverse engineer the software.</p>',
  content_bottom_html:
    '<p>By accepting, Mark Gilbert confirms the details above are accurate and agrees to be bound by this agreement on behalf of the licensee.</p>',
  fields: [
    {
      param: 'phone_number',
      label: 'Phone number',
      autocomplete: 'tel',
      group: 'identity',
      control: 'text',
      span: 'full',
      required: true,
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
    {
      param: 'state',
      label: 'State/Region',
      autocomplete: 'address-level1',
      group: 'address',
      control: 'state',
      span: 'half',
      required: true,
    },
    {
      param: 'city',
      label: 'City',
      autocomplete: 'address-level2',
      group: 'address',
      control: 'text',
      span: 'half',
      required: true,
    },
    {
      param: 'postal_code',
      label: 'Postal/Zip code',
      autocomplete: 'postal-code',
      group: 'address',
      control: 'text',
      span: 'half',
      required: true,
    },
    {
      param: 'address_line_1',
      label: 'Street address',
      autocomplete: 'address-line1',
      group: 'address',
      control: 'text',
      span: 'full',
      required: true,
    },
    {
      param: 'address_line_2',
      label: 'Street address 2 (optional)',
      autocomplete: 'address-line2',
      group: 'address',
      control: 'text',
      span: 'full',
      required: false,
    },
  ],
  identity_group_title: 'Phone verification',
};

const EU_COUNTRIES = [
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
];

const REGION_SETS = {
  EU: EU_COUNTRIES,
  EEA: [...EU_COUNTRIES, 'IS', 'LI', 'NO'],
  UK: ['GB'],
};

const regionsOf = row => (Array.isArray(row.regions) ? row.regions : []);

const countriesOf = regions => new Set(regions.flatMap(region => REGION_SETS[region] || [region]));

const covers = (regions, region) => regions.includes(region) || countriesOf(regions).has(region);

const overlaps = (left, right) => {
  const claimed = countriesOf(left);
  return [...countriesOf(right)].some(code => claimed.has(code));
};

const policyAnswer = ({ name, label, version, created_at, updated_at, content_html }) => ({
  name,
  label,
  version,
  created_at,
  updated_at,
  content_html,
});

const POLICIES = [
  {
    name: 'privacy',
    regions: [],
    label: 'Privacy Policy',
    version: '3.0',
    created_at: '2025-01-09T00:00:00Z',
    updated_at: '2026-08-14T00:00:00Z',
    content_html:
      '<h2>1. Information We Collect</h2><p>We collect information you provide directly to us.</p>',
  },
  {
    name: 'privacy',
    regions: ['EEA', 'UK'],
    label: 'Privacy Policy',
    version: '3.0',
    created_at: '2025-01-09T00:00:00Z',
    updated_at: '2026-08-14T00:00:00Z',
    content_html:
      '<h2>1. Information We Collect</h2><p>We collect information you provide directly to us, as the GDPR and the UK GDPR allow.</p>',
  },
  {
    name: 'terms',
    regions: [],
    label: 'Terms of Service',
    version: '2.0',
    created_at: '2025-01-09T00:00:00Z',
    updated_at: '2026-01-09T00:00:00Z',
    content_html: '<h2>Terms</h2><p>These terms govern your use of the service.</p>',
  },
];

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
    region: null,
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
    type: 'site',
    version: '2.0',
    first_accepted_at: '2025-01-10T00:00:00Z',
    accepted_at: '2026-01-10T00:00:00Z',
    versions: [
      { version: '2.0', accepted_at: '2026-01-10T00:00:00Z' },
      { version: '1.0', accepted_at: '2025-01-10T00:00:00Z' },
    ],
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
            'tos-names': {
              type: 'array',
              items: { type: 'string' },
              orderable: true,
              title: 'Terms',
              order: 4,
            },
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
                'tos-names': {
                  type: 'array',
                  items: { type: 'string' },
                  orderable: true,
                  title: 'Terms',
                  order: 4,
                },
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
      startcloud: {
        name: 'STARTcloud',
        domains: ['auth.startcloud.com'],
        customer_id: 'A55DF1',
        'tos-names': ['terms', 'privacy'],
      },
      moonshinedev: {
        name: 'Moonshine.dev',
        domains: ['auth.moonshine.dev'],
        'tos-names': ['terms'],
      },
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
          'tos-names': ['conductor-msa'],
        },
      },
      boxvault: {
        client: {
          'client-id': 'boxvault',
          'client-name': 'BoxVault',
          'redirect-uris': ['https://boxvault.startcloud.com/auth/callback'],
          'tos-names': [],
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
  terms: TERMS.map(document => ({
    ...document,
    copies: document.copies.map(copy => ({ ...copy })),
  })),
  termHistory: new Map(),
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
  if (flag === 'terms') {
    state.pending = 'terms';
    return '/oauth2/accept-terms';
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
    .filter(document => isAdmin() || document.is_public)
    .filter(
      document =>
        has(needle, document.name, document.friendly_name) ||
        document.copies.some(copy => has(needle, copy.content))
    )
    .map(document =>
      searchRow({
        kind: 'terms',
        org: '',
        name: document.name,
        title: document.friendly_name,
        subtitle: `v${document.copies[0]?.version || ''}`,
        matched: has(needle, document.name, document.friendly_name) ? 'name' : 'description',
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

const termsRoute = (method, pattern, handler) => route(method, pattern, handler, { terms: true });

publicRoute('GET', '/api/status', () => ok(STATUS));
publicRoute('GET', '/api/health', () => ok(health()));
publicRoute('GET', '/api/rules', () => ok(RULES));
publicRoute('GET', '/api/auth/methods', () => ok(METHODS));
publicRoute('GET', '/api/public/site/branding', () => ok(BRANDING));
publicRoute('GET', '/api/public/geo/country', () => ok({ country_code: 'US' }));
const resolveVariant = (variants, forced) => {
  const region = forced || state.profile.address.country_code || 'US';
  return (
    variants.find(row => covers(regionsOf(row), region)) ||
    variants.find(row => regionsOf(row).length === 0)
  );
};

publicRoute('GET', '/api/policies/:name', ctx => {
  const variants = POLICIES.filter(row => row.name === ctx.params.name);
  const policy = resolveVariant(variants, ctx.url.searchParams.get('region') || '');
  return policy ? ok(policyAnswer(policy)) : problem(404, 'not_found');
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
  if (state.pending === 'terms') {
    finishSignIn();
  }
  return ok({ next: '/' });
};

termsRoute('GET', '/api/auth/terms', ctx => {
  const requested = ctx.url.searchParams.get('region');
  if (requested && !TERMS_REGIONS.includes(requested)) {
    return invalid('/region', 'enum', { enum: TERMS_REGIONS });
  }
  const region = requested || state.profile.preferences.region || null;
  const previous = mockFlag(ctx) === 'previous';
  return ok({
    ...TERMS_STATE,
    region,
    person_region: region,
    versions: TERMS_VERSIONS,
    ...(previous ? { previous: TERMS_PREVIOUS, changes_html: TERMS_CHANGES_HTML } : {}),
  });
});
termsRoute('GET', '/api/auth/terms/versions/:version', ctx => {
  const match = TERMS_VERSIONS.find(row => row.version === ctx.params.version);
  if (!match) {
    return problem(404, 'not_found');
  }
  return ok({
    version: match.version,
    published_at: match.published_at,
    content_html:
      match.version === TERMS_STATE.version ? TERMS_STATE.content_html : TERMS_OLD_CONTENT_HTML,
  });
});
termsRoute('POST', '/oauth2/accept-terms', acceptTerms);
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
  if (state.pending === 'terms') {
    return problem(403, 'terms_required', { next: '/oauth2/accept-terms' });
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
route(
  'PATCH',
  '/api/user/preferences',
  ctx => {
    const { ciba_user_code: pin, ...rest } = ctx.body;
    Object.assign(state.profile.preferences, rest);
    if (pin !== undefined) {
      state.profile.preferences.ciba_user_code_set = pin !== null && pin !== '';
    }
    return ok(state.profile);
  },
  { session: true, terms: true }
);
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
sessionRoute('POST', '/api/user/organizations/:uuid/invites/:id/resend', ctx => {
  const org = organizationOf(ctx);
  const invite = org?.pending_invites.find(row => String(row.id) === ctx.params.id);
  if (!invite) {
    return problem(404, 'not_found');
  }
  const elapsed = invite._resent_at ? Date.now() - invite._resent_at : Infinity;
  if (elapsed < 60000) {
    return problem(429, 'throttled', { wait_seconds: Math.ceil((60000 - elapsed) / 1000) });
  }
  invite._resent_at = Date.now();
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
sessionRoute('POST', '/api/notifications/:id/unread', ctx => {
  const row = state.notifications.find(entry => entry.id === ctx.params.id);
  if (!row) {
    return problem(404, 'not_found');
  }
  row.readAt = null;
  broadcast('unread-count', { count: unreadCount() });
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
const USER_STEP_UP_ACTIONS = ['delete', 'revoke_sessions'];
adminRoute('POST', '/api/admin/users/bulk', ctx => {
  const { action, user_ids: ids = [] } = ctx.body;
  if (USER_STEP_UP_ACTIONS.includes(action) && Date.now() > state.stepUpUntil) {
    return problem(403, 'step_up_required');
  }
  const errors = [];
  let processed = 0;
  (Array.isArray(ids) ? ids : []).forEach(id => {
    const user = USERS.items.find(row => String(row.id) === String(id));
    if (!user) {
      errors.push({ id, code: 'not_found' });
      return;
    }
    if (action === 'set_primary_organization') {
      if (!user.organizations.some(org => org.uuid === ctx.body.primary_organization)) {
        errors.push({ id, code: 'not_a_member' });
        return;
      }
      user.organizations.forEach(org => {
        org.primary = org.uuid === ctx.body.primary_organization;
      });
    }
    if (action === 'set_customer_id') {
      user.customer_id = ctx.body.customer_id || '';
    }
    if (action === 'enable') {
      user.enabled = true;
    }
    if (action === 'suspend') {
      if (user.id === 42) {
        errors.push({ id, code: 'self' });
        return;
      }
      user.enabled = false;
    }
    if (action === 'add_role' && ctx.body.role && !user.roles.includes(ctx.body.role)) {
      user.roles.push(ctx.body.role);
    }
    if (action === 'remove_role' && ctx.body.role) {
      if (user.id === 42 && ctx.body.role === 'ROLE_ADMIN') {
        errors.push({ id, code: 'self' });
        return;
      }
      user.roles = user.roles.filter(role => role !== ctx.body.role);
    }
    if (action === 'delete' && user.id === 42) {
      errors.push({ id, code: 'self' });
      return;
    }
    processed += 1;
  });
  return ok({ processed, skipped: errors.length, errors });
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
const ORG_PERSONAL_GATE = ['set_access_mode', 'set_default_role', 'regenerate_invite_code'];
adminRoute('POST', '/api/admin/organizations/bulk', ctx => {
  const { action, organization_ids: ids = [] } = ctx.body;
  if (action === 'delete' && Date.now() > state.stepUpUntil) {
    return problem(403, 'step_up_required');
  }
  const errors = [];
  let processed = 0;
  (Array.isArray(ids) ? ids : []).forEach(id => {
    const org = ORGANIZATIONS.find(row => String(row.id) === String(id));
    if (!org) {
      errors.push({ id, code: 'not_found' });
      return;
    }
    if (ORG_PERSONAL_GATE.includes(action) && org.personal) {
      errors.push({ id, code: 'personal' });
      return;
    }
    if (action === 'suspend') {
      org.enabled = false;
    }
    if (action === 'resume') {
      org.enabled = true;
    }
    if (action === 'set_customer_id') {
      org.customer_id = ctx.body.customer_id || '';
    }
    if (action === 'set_access_mode') {
      org.access_mode = ctx.body.access_mode;
    }
    if (action === 'set_default_role') {
      org.default_role = ctx.body.default_role;
    }
    if (action === 'regenerate_invite_code') {
      org.invite_code = `INV-${randomBytes(4).toString('hex').toUpperCase()}`;
    }
    processed += 1;
  });
  return ok({ processed, skipped: errors.length, errors });
});
adminRoute('GET', '/api/admin/service-usage', () => ok(SERVICE_USAGE));
adminRoute('GET', '/api/admin/insights', () => ok(INSIGHTS));
adminRoute('GET', '/api/admin/client-health', () => ok(CLIENT_HEALTH));
adminRoute('POST', '/api/admin/sessions/bulk', ctx => {
  if (Date.now() > state.stepUpUntil) {
    return problem(403, 'step_up_required');
  }
  const ids = Array.isArray(ctx.body.session_ids) ? ctx.body.session_ids : [];
  const errors = [];
  let processed = 0;
  ids.forEach(id => {
    if (!SESSIONS.items.some(row => row.id === id)) {
      errors.push({ id, code: 'not_found' });
      return;
    }
    processed += 1;
  });
  return ok({ processed, skipped: errors.length, errors });
});
adminRoute('GET', '/api/admin/brute-force', () =>
  ok({ enabled: BRUTE_FORCE.enabled, blocked: state.blocked })
);
adminRoute('GET', '/api/admin/brute-force/count', () => ok({ count: state.blocked.length }));
adminRoute('DELETE', '/api/admin/brute-force/:ip', ctx => {
  state.blocked = state.blocked.filter(row => row.ip !== ctx.params.ip);
  broadcast('blocked-count', { count: state.blocked.length });
  return noContent();
});
adminRoute('DELETE', '/api/admin/brute-force', () => {
  state.blocked = [];
  broadcast('blocked-count', { count: 0 });
  return noContent();
});
adminRoute('POST', '/api/admin/brute-force/bulk', ctx => {
  const addresses = Array.isArray(ctx.body.addresses) ? ctx.body.addresses : [];
  const errors = [];
  let processed = 0;
  addresses.forEach(ip => {
    if (!state.blocked.some(row => row.ip === ip)) {
      errors.push({ id: ip, code: 'not_blocked' });
      return;
    }
    processed += 1;
  });
  state.blocked = state.blocked.filter(row => !addresses.includes(row.ip));
  broadcast('blocked-count', { count: state.blocked.length });
  return ok({ processed, skipped: errors.length, errors });
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
const uniqueProblem = (pointer, scope) =>
  problem(409, 'unique', { errors: [{ pointer, rule: 'unique', params: { scope } }] });

const readOnlyProblem = pointer =>
  problem(422, 'validation', {
    errors: [{ pointer, rule: 'readOnly', params: {}, detail: `${pointer} is read-only` }],
  });

const documentOf = name => state.terms.find(document => document.name === name);

const copyOf = (document, region) =>
  region
    ? document.copies.find(copy => regionsOf(copy).includes(region))
    : document.copies.find(copy => regionsOf(copy).length === 0);

let copySeq = state.terms.reduce(
  (max, document) => Math.max(max, ...document.copies.map(copy => Number(copy.id) || 0)),
  0
);
const nextCopyId = () => {
  copySeq += 1;
  return copySeq;
};

const previousVersionOf = version => {
  const match = /^(?<major>\d+)\.(?<minor>\d+)$/.exec(String(version));
  return match
    ? `${Math.max(0, Number(match.groups.major) - 1)}.${match.groups.minor}`
    : `${version}-prior`;
};

const seedCopyHistory = copy => {
  const priorContent = `${copy.content}\n\n(prior version)`;
  state.termHistory.set(copy.id, {
    versions: [
      {
        version: copy.version,
        revisions: [
          {
            revision: 1,
            content: `${copy.content}\n\n(initial revision)`,
            published_by: copy.created_by,
            published_at: copy.updated_at,
          },
          {
            revision: 2,
            content: copy.content,
            published_by: copy.created_by,
            published_at: copy.updated_at,
          },
        ],
      },
      {
        version: previousVersionOf(copy.version),
        revisions: [
          {
            revision: 1,
            content: `${priorContent}\n\n(initial revision)`,
            published_by: copy.created_by,
            published_at: copy.updated_at,
          },
          {
            revision: 2,
            content: priorContent,
            published_by: copy.created_by,
            published_at: copy.updated_at,
          },
        ],
      },
    ],
  });
};

const seedNewCopyHistory = copy => {
  state.termHistory.set(copy.id, {
    versions: [
      {
        version: copy.version,
        revisions: [
          {
            revision: 1,
            content: copy.content,
            published_by: copy.created_by,
            published_at: copy.updated_at,
          },
        ],
      },
    ],
  });
};

state.terms.forEach(document => {
  document.copies.forEach(copy => {
    copy.revision = 2;
    seedCopyHistory(copy);
  });
});

const copyConflict = (regions, siblings) => {
  if (regions.length === 0 && siblings.some(copy => regionsOf(copy).length === 0)) {
    return uniqueProblem('/regions', 'default');
  }
  if (siblings.some(copy => overlaps(regionsOf(copy), regions))) {
    return uniqueProblem('/regions', 'region');
  }
  return null;
};

const DOCUMENT_FIELDS = ['friendly_name', 'icon', 'type', 'is_public'];
const COPY_FIELDS = ['content', 'regions'];

adminRoute('POST', '/api/admin/terms', ctx => {
  const regions = regionsOf(ctx.body);
  const existing = documentOf(ctx.body.name);
  const refused = copyConflict(regions, existing ? existing.copies : []);
  if (refused) {
    return refused;
  }
  const copy = {
    id: nextCopyId(),
    regions,
    version: ctx.body.version,
    revision: 1,
    content: ctx.body.content,
    created_by: 'mark@m4kr.net',
    updated_at: NOW(),
  };
  seedNewCopyHistory(copy);
  if (existing) {
    existing.copies.push(copy);
    DOCUMENT_FIELDS.forEach(field => {
      if (ctx.body[field] !== undefined) {
        existing[field] = ctx.body[field];
      }
    });
    return ok(existing, 201);
  }
  const document = {
    name: ctx.body.name,
    friendly_name: ctx.body.friendly_name,
    icon: ctx.body.icon,
    type: ctx.body.type,
    is_public: Boolean(ctx.body.is_public),
    copies: [copy],
  };
  state.terms.push(document);
  return ok(document, 201);
});
adminRoute('PATCH', '/api/admin/terms/:name', ctx => {
  const document = documentOf(ctx.params.name);
  if (!document) {
    return problem(404, 'not_found');
  }
  if (ctx.body.version !== undefined) {
    return readOnlyProblem('/version');
  }
  const region = ctx.url.searchParams.get('region') || '';
  const touchesCopy = COPY_FIELDS.some(field => ctx.body[field] !== undefined);
  if (touchesCopy) {
    const copy = copyOf(document, region);
    if (!copy) {
      return problem(404, 'not_found');
    }
    const regions = ctx.body.regions === undefined ? regionsOf(copy) : regionsOf(ctx.body);
    const refused = copyConflict(
      regions,
      document.copies.filter(entry => entry !== copy)
    );
    if (refused) {
      return refused;
    }
    Object.assign(copy, ctx.body, { regions, updated_at: NOW() });
    if (ctx.body.content !== undefined) {
      const history = state.termHistory.get(copy.id);
      const versionEntry = history.versions.find(entry => entry.version === copy.version);
      const nextRevision = Math.max(0, ...versionEntry.revisions.map(entry => entry.revision)) + 1;
      versionEntry.revisions.push({
        revision: nextRevision,
        content: copy.content,
        published_by: state.profile.email,
        published_at: copy.updated_at,
      });
      copy.revision = nextRevision;
    }
  }
  DOCUMENT_FIELDS.forEach(field => {
    if (ctx.body[field] !== undefined) {
      document[field] = ctx.body[field];
    }
  });
  return ok(document);
});
adminRoute('POST', '/api/admin/terms/:name/publish', ctx => {
  const document = documentOf(ctx.params.name);
  if (!document) {
    return problem(404, 'not_found');
  }
  const region = ctx.url.searchParams.get('region') || '';
  const copy = copyOf(document, region);
  if (!copy) {
    return problem(404, 'not_found');
  }
  const version = String(ctx.body.version || '').trim();
  if (!version) {
    return invalid('/version', 'required');
  }
  const history = state.termHistory.get(copy.id);
  if (history.versions.some(entry => entry.version === version)) {
    return uniqueProblem('/version', document.name);
  }
  const content = ctx.body.content !== undefined ? ctx.body.content : copy.content;
  const publishedAt = NOW();
  history.versions.unshift({
    version,
    revisions: [
      { revision: 1, content, published_by: state.profile.email, published_at: publishedAt },
    ],
  });
  copy.version = version;
  copy.content = content;
  copy.revision = 1;
  copy.updated_at = publishedAt;
  return ok(document);
});
adminRoute('GET', '/api/admin/terms/:name/history', ctx => {
  const document = documentOf(ctx.params.name);
  if (!document) {
    return problem(404, 'not_found');
  }
  const region = ctx.url.searchParams.get('region') || '';
  const copy = copyOf(document, region);
  if (!copy) {
    return problem(404, 'not_found');
  }
  const history = state.termHistory.get(copy.id);
  return ok({
    name: document.name,
    region: region || null,
    versions: history.versions.map(entry => ({
      version: entry.version,
      revisions: [...entry.revisions]
        .sort((left, right) => right.revision - left.revision)
        .map(revisionRow => ({
          revision: revisionRow.revision,
          published_by: revisionRow.published_by,
          published_at: revisionRow.published_at,
          current: entry.version === copy.version && revisionRow.revision === copy.revision,
        })),
    })),
  });
});
adminRoute('GET', '/api/admin/terms/:name/history/:version/:revision', ctx => {
  const document = documentOf(ctx.params.name);
  if (!document) {
    return problem(404, 'not_found');
  }
  const region = ctx.url.searchParams.get('region') || '';
  const copy = copyOf(document, region);
  if (!copy) {
    return problem(404, 'not_found');
  }
  const history = state.termHistory.get(copy.id);
  const versionEntry = history.versions.find(entry => entry.version === ctx.params.version);
  const revisionEntry = versionEntry?.revisions.find(
    entry => String(entry.revision) === ctx.params.revision
  );
  if (!revisionEntry) {
    return problem(404, 'not_found');
  }
  return ok({
    version: versionEntry.version,
    revision: revisionEntry.revision,
    published_by: revisionEntry.published_by,
    published_at: revisionEntry.published_at,
    content: revisionEntry.content,
  });
});
adminRoute('DELETE', '/api/admin/terms/:name', ctx => {
  const document = documentOf(ctx.params.name);
  if (!document) {
    return problem(404, 'not_found');
  }
  const region = ctx.url.searchParams.get('region') || '';
  const copy = copyOf(document, region);
  if (!copy) {
    return problem(404, 'not_found');
  }
  document.copies = document.copies.filter(entry => entry !== copy);
  if (document.copies.length === 0) {
    state.terms = state.terms.filter(entry => entry !== document);
  }
  return noContent();
});
adminRoute('POST', '/api/admin/terms/bulk', ctx => {
  const { action, ids = [] } = ctx.body;
  if (action === 'delete' && Date.now() > state.stepUpUntil) {
    return problem(403, 'step_up_required');
  }
  const errors = [];
  let processed = 0;
  (Array.isArray(ids) ? ids : []).forEach(id => {
    const document = state.terms.find(entry => entry.copies.some(copy => copy.id === id));
    const copy = document && document.copies.find(entry => entry.id === id);
    if (!copy) {
      errors.push({ id, code: 'not_found' });
      return;
    }
    if (action === 'delete') {
      document.copies = document.copies.filter(entry => entry !== copy);
      if (document.copies.length === 0) {
        state.terms = state.terms.filter(entry => entry !== document);
      }
    }
    if (action === 'set_public') {
      document.is_public = true;
    }
    if (action === 'set_private') {
      document.is_public = false;
    }
    processed += 1;
  });
  return ok({ processed, skipped: errors.length, errors });
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

const onboardingRefusal = gate => {
  if (gate.onboarding && !state.signedIn && state.pending !== 'onboarding') {
    return problem(401, 'session_expired');
  }
  if (gate.tfa && !state.signedIn && state.pending !== 'tfa') {
    return problem(401, 'session_expired');
  }
  if (gate.terms && !gate.session && !gate.admin && !state.signedIn && state.pending !== 'terms') {
    return problem(401, 'session_expired');
  }
  return null;
};

const sessionRefusal = gate => {
  if (!(gate.session || gate.admin) || state.signedIn) {
    return null;
  }
  if (gate.terms && state.pending === 'terms') {
    return null;
  }
  if (state.pending === 'onboarding') {
    return problem(403, 'onboarding_required', { next: onboardingNext(state.onboarding) });
  }
  if (state.pending === 'terms') {
    return problem(403, 'terms_required', { next: '/oauth2/accept-terms' });
  }
  return problem(401, 'unauthenticated');
};

const adminRefusal = gate => {
  if (gate.admin && !state.profile.roles.includes('ROLE_ADMIN')) {
    return problem(403, 'forbidden');
  }
  if (gate.stepUp && Date.now() > state.stepUpUntil) {
    return problem(403, 'step_up_required');
  }
  return null;
};

const gateRefusal = gate => onboardingRefusal(gate) || sessionRefusal(gate) || adminRefusal(gate);

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
 * chain after sign-in, `/login?mock=tfa` to enter `/authenticator` and
 * `/login?mock=terms` to enter `/oauth2/accept-terms` with `GET /api/user`
 * answering `403 terms_required` until it is accepted.
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
 * no third-party service. `GET /api/user/terms` answers `first_accepted_at`
 * and `versions` beside the latest per document (decision 159). Terms
 * copies carry `regions` (decision 133): `GET /api/policies/{name}`
 * resolves the copy by `?region=`, else the profile's address country,
 * else `US`, then the default; the admin terms routes answer one row per
 * document with its copies nested (decision 157), each copy carrying
 * `revision` beside `version` (decision 161); `POST` adds a copy to
 * an existing document or a new document with one, at revision 1,
 * refusing `409 unique` at `/regions` when the sets overlap; `PATCH`
 * writes `friendly_name`, `icon`, `type` and `is_public` to the document
 * and `content` and `regions` to the copy `?region=` names or the
 * default, writing the next revision under the copy's current version
 * and refusing a `version` member `422 readOnly` at `/version`;
 * `POST …/{name}/publish` writes revision 1 of a new, different version
 * (`409 unique` at `/version` when the copy has had it), and
 * `GET …/{name}/history` and `…/history/{version}/{revision}` answer the
 * copy's versions with their revisions, two of each seeded per copy, and
 * one revision's raw markdown; `DELETE`
 * drops that copy, the document with it once none remain; `PUT
 * /api/admin/terms/order` is gone, the order being the `sites` and
 * `clients` schemas' `tos-names`, drawn by `ConfigField` as the shared
 * `SortableList` for `orderable: true` (decision 89). `GET /api/auth/terms`
 * answers `regions_offered` beside `region`, honors `?region=` (`422 enum`
 * at `/region` otherwise) and falls back to the stored `preferences.region`,
 * which the preferences
 * PATCH accepts and stores like every other member; it also always answers
 * `person_region` (the resolved region), `scope: 'client'` and `versions`
 * newest first, and, only behind a `?mock=previous` flag on the URL or the
 * referer, `previous` and a `changes_html` with `ins`/`del` markup, so the
 * "What changed" toggle has something to show. `GET /api/auth/terms/versions/:version`
 * answers a fixture's `content_html` for a known version and `404 not_found`
 * otherwise. Both routes and `POST /oauth2/accept-terms` stay open while
 * `state.pending` is `'terms'`, the way the onboarding routes stay open
 * while it is `'onboarding'`; every other session- or admin-gated route
 * answers `403 terms_required` with `next: '/oauth2/accept-terms'` the
 * same way `GET /api/user` does, so `?mock=terms` shows the gate on every
 * page and not `/api/user` alone.
 * Every code entry accepts any six digits except `000000` (invalid),
 * `111111` (expired), `222222` (locked) and `333333` (throttled); a token
 * of `invalid` or `expired` refuses a magic, bootstrap, verification,
 * reset or invitation link, and `disabled` answers the disabled-account
 * code on the magic and bootstrap links;
 * an address starting with `throttle` is throttled, one starting with
 * `taken` is already taken on the email change; a current password of
 * `wrong` fails the step-up and the password change. The first sensitive
 * call answers `403 step_up_required` until `POST /api/user/step-up`
 * arms the five-minute window. `POST /api/admin/users/bulk` answers
 * `set_customer_id`, `set_primary_organization`, `revoke_sessions` and
 * `unlock` beside its enable, suspend, role and delete actions, `delete`
 * and `revoke_sessions` stepped up, a skipped row named `self`,
 * `not_found` or `not_a_member`. `POST /api/admin/organizations/bulk`
 * answers `set_customer_id`, `set_access_mode`, `set_default_role` and
 * `regenerate_invite_code` beside suspend, resume and delete, its delete
 * stepped up, a personal organization skipped as `personal`.
 * `POST /api/admin/sessions/bulk` revokes a selection, stepped up, an
 * unknown id skipped as `not_found`. `DELETE /api/admin/brute-force`
 * unblocks every address and `POST /api/admin/brute-force/bulk` unblocks a
 * selection, an address off the table skipped as `not_blocked`.
 * `POST /api/admin/terms/bulk` deletes, publishes or unpublishes a
 * selection of copy ids, its delete stepped up, an unknown id skipped
 * as `not_found`.
 * `GET /api/events` streams `ready`, one
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
 * `POST /api/notifications/{id}/unread` puts a row back to unread and
 * broadcasts `unread-count` (decision 151).
 * `POST /api/user/organizations/{uuid}/invites/{id}/resend` answers
 * `204` and refuses `429 throttled` with `wait_seconds` inside its own
 * sixty-second window per invite (decision 152).
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
