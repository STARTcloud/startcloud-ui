const page = items => ({ items, page: 1, size: 25, total: items.length, total_pages: 1 });

export const STATS = {
  total_users: 1284,
  logins_today: 312,
  registrations_this_week: 27,
  failed_logins_today: 9,
  active_sessions: 418,
  recent_logins: [
    {
      username: 'jgilbert@example.com',
      city: 'Austin',
      country: 'US',
      success: false,
      timestamp: '2026-09-06T13:58:00Z',
    },
    {
      username: 'mark@m4kr.net',
      city: 'Chicago',
      country: 'US',
      success: true,
      timestamp: '2026-09-06T13:41:00Z',
    },
  ],
  recent_registrations: [
    { username: 'pat@acme.example', email_verified: true, timestamp: '2026-09-06T11:20:00Z' },
    { username: 'lee@moonshine.dev', email_verified: true, timestamp: '2026-09-05T08:02:00Z' },
  ],
};

export const HEATMAP = {
  tiles: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    max_zoom: 19,
    referrer_policy: 'no-referrer',
  },
  points: [
    { city: 'Austin', country: 'US', lat: 30.2672, lng: -97.7431, count: 184 },
    { city: 'Chicago', country: 'US', lat: 41.8781, lng: -87.6298, count: 96 },
    { city: 'Berlin', country: 'DE', lat: 52.52, lng: 13.405, count: 12 },
  ],
};

export const RESTART_STATUS = {
  restart_required: true,
  last_modified_by: 'mark@m4kr.net',
  last_modified_time: '2026-09-06T13:58:00Z',
};

export const USERS = page([
  {
    id: 42,
    username: 'mark@m4kr.net',
    full_name: 'Mark Gilbert',
    customer_id: 'B5E4A2',
    enabled: true,
    using_2fa: true,
    roles: ['ROLE_USER', 'ROLE_ADMIN'],
    organizations: [
      { uuid: 'a1', name: 'Acme Inc.', role: 'OWNER', primary: true, personal: false },
      { uuid: 'p1', name: 'Prominic', role: 'MEMBER', primary: false, personal: false },
    ],
  },
  {
    id: 43,
    username: 'jgilbert@example.com',
    full_name: 'Jo Gilbert',
    customer_id: '',
    enabled: false,
    using_2fa: false,
    roles: ['ROLE_USER'],
    organizations: [
      { uuid: 'j1', name: 'Jo Gilbert', role: 'OWNER', primary: true, personal: true },
    ],
  },
]);

export const ROLES = ['ROLE_USER', 'ROLE_ADMIN'];

export const RATE_LIMIT = {
  sign_in: { armed: true, wait_seconds: 240 },
  tfa: { SMS: 'locked', APP: 'clear', BACKUP_CODE: 'clear' },
  banned: false,
};

const EMPTY_ADDRESS = {
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

export const ORGANIZATIONS = [
  {
    id: 1,
    uuid: 'a1',
    name: 'Acme Inc.',
    personal: false,
    invite_code: 'INV-7K3M9QP2',
    customer_id: 'A55DF0',
    created_at: '2025-01-09T00:00:00Z',
    member_count: 3,
    email: 'ops@acme.example',
    website_url: 'https://acme.example',
    logo_url: '',
    description: 'Acme Inc.',
    locale: 'en',
    timezone: 'America/Chicago',
    telephone: '+15125550100',
    address: {
      ...EMPTY_ADDRESS,
      line1: '100 Congress Ave',
      city: 'Austin',
      state: 'Texas',
      postal_code: '78701',
      country: 'United States',
      country_code: 'US',
    },
    access_mode: 'invite',
    default_role: 'MEMBER',
  },
  {
    id: 2,
    uuid: 'j1',
    name: 'Mark Gilbert',
    personal: true,
    invite_code: '',
    customer_id: '',
    created_at: '2024-12-28T00:00:00Z',
    member_count: 1,
    email: 'mark@m4kr.net',
    website_url: '',
    logo_url: '',
    description: '',
    locale: 'en',
    timezone: 'America/Chicago',
    telephone: '',
    address: { ...EMPTY_ADDRESS },
    access_mode: 'private',
    default_role: 'MEMBER',
  },
  {
    id: 3,
    uuid: 'p1',
    name: 'Prominic',
    personal: false,
    invite_code: 'INV-2B8XQ4LM',
    customer_id: 'A55DF1',
    created_at: '2024-12-28T00:00:00Z',
    member_count: 12,
    email: 'support@prominic.net',
    website_url: 'https://prominic.net',
    logo_url: '',
    description: 'Prominic.NET, Inc.',
    locale: 'en',
    timezone: 'America/Chicago',
    telephone: '+12173561300',
    address: {
      ...EMPTY_ADDRESS,
      line1: '105 W Main St',
      city: 'Urbana',
      state: 'Illinois',
      postal_code: '61801',
      country: 'United States',
      country_code: 'US',
    },
    access_mode: 'request',
    default_role: 'MEMBER',
  },
];

export const LOGINS = page([
  {
    timestamp: '2026-09-06T13:58:00Z',
    username: 'jgilbert@example.com',
    success: false,
    failure_reason: 'bad credentials',
    ip_address: '203.0.113.7',
    city: 'Austin',
    country: 'US',
    user_agent: 'Chrome on Windows',
  },
  {
    timestamp: '2026-09-06T13:41:00Z',
    username: 'mark@m4kr.net',
    success: false,
    failure_reason: 'second factor expired',
    ip_address: '198.51.100.2',
    city: 'Chicago',
    country: 'US',
    user_agent: 'Firefox on Linux',
  },
]);

export const REGISTRATIONS = page([
  {
    timestamp: '2026-09-06T11:20:00Z',
    username: 'pat@acme.example',
    email_verified: true,
    phone_verified: false,
    ip_address: '203.0.113.7',
    city: 'Austin',
    country: 'US',
  },
  {
    timestamp: '2026-09-05T08:02:00Z',
    username: 'lee@moonshine.dev',
    email_verified: true,
    phone_verified: true,
    ip_address: '198.51.100.2',
    city: 'Chicago',
    country: 'US',
  },
]);

export const SESSIONS = page([
  {
    id: 's1',
    full_name: 'Mark Gilbert',
    client_name: 'Conductor',
    ip_address: '203.0.113.7',
    location: 'Austin, US',
    user_agent: 'Chrome on Windows',
    authorized_at: '2026-09-06T12:02:00Z',
    last_accessed_at: '2026-09-06T14:06:00Z',
  },
  {
    id: 's2',
    full_name: 'Jo Gilbert',
    client_name: 'BoxVault',
    ip_address: '198.51.100.2',
    location: 'Chicago, US',
    user_agent: 'Firefox on Linux',
    authorized_at: '2026-09-03T08:15:00Z',
    last_accessed_at: '2026-09-05T19:40:00Z',
  },
]);

export const SERVICE_USAGE = {
  total_sessions: 418,
  total_authorizations: 6204,
  items: [
    {
      client_id: 'conductor',
      client_name: 'Conductor',
      active_sessions: 271,
      total_authorizations: 4112,
      unique_users: 640,
      first_used_at: '2025-01-09T00:00:00Z',
      last_used_at: '2026-09-06T14:00:00Z',
    },
    {
      client_id: 'boxvault',
      client_name: 'BoxVault',
      active_sessions: 147,
      total_authorizations: 2092,
      unique_users: 388,
      first_used_at: '2025-02-01T00:00:00Z',
      last_used_at: '2026-09-06T13:30:00Z',
    },
  ],
};

export const INSIGHTS = {
  active_users: { daily: 84, weekly: 312, monthly: 640, quarterly: 905 },
  posture: {
    total_users: 1284,
    enabled_users: 1251,
    disabled_users: 33,
    using_2fa: 402,
    email_verified: 1180,
    phone_verified: 366,
    admins: 4,
    never_logged_in: 57,
    with_local_auth: 1100,
    with_external_auth: 184,
    with_linked_provider: 92,
  },
  app_activity: [
    {
      client_id: 'conductor',
      client_name: 'Conductor',
      active_30d: 512,
      adopted_30d: 31,
      total_users: 640,
    },
    {
      client_id: 'boxvault',
      client_name: 'BoxVault',
      active_30d: 298,
      adopted_30d: 12,
      total_users: 388,
    },
  ],
  penetration: [
    { app_count: 1, users: 720 },
    { app_count: 2, users: 410 },
  ],
  app_pairs: [{ app_a: 'Conductor', app_b: 'BoxVault', users: 388 }],
  growth: [
    { week: '2026-08-24', count: 19 },
    { week: '2026-08-31', count: 27 },
  ],
  churn: { quiet_30: 120, quiet_60: 84, quiet_90: 57, enabled_total: 1251 },
  quiet_users: [
    { username: 'old@example.com', last_login_at: '2026-05-01T00:00:00Z' },
    { username: 'never@example.com', last_login_at: null },
  ],
  org_rollup: [
    { name: 'Acme Inc.', customer_id: 'A55DF0', personal: false, members: 3, active_30d: 3 },
    { name: 'Prominic', customer_id: 'A55DF1', personal: false, members: 12, active_30d: 9 },
  ],
};

export const CLIENT_HEALTH = {
  summary: { status: 'warning', healthy: 2, total: 3 },
  clients: [
    {
      client_id: 'conductor',
      client_name: 'Conductor',
      description: '',
      base_url: 'https://staging.startcloud.com',
      check: 'actuator_health',
      endpoint: 'https://staging.startcloud.com/actuator/health',
      healthy: true,
      status: 'online',
      response_time_ms: 142,
      last_checked: '2026-09-06T14:00:00Z',
      error_message: '',
    },
    {
      client_id: 'boxvault',
      client_name: 'BoxVault',
      description: '',
      base_url: 'https://boxvault.startcloud.com',
      check: 'http_reachability',
      endpoint: 'https://boxvault.startcloud.com',
      healthy: false,
      status: 'unreachable',
      response_time_ms: null,
      last_checked: '2026-09-06T14:00:00Z',
      error_message: 'timed out',
    },
    {
      client_id: 'switchboard-desktop',
      client_name: 'SwitchBoard Desktop',
      description: '',
      base_url: 'swb://app/home',
      check: null,
      endpoint: null,
      healthy: null,
      status: 'not_probeable',
      response_time_ms: null,
      last_checked: null,
      error_message: '',
    },
  ],
  providers: [
    {
      client_id: 'google',
      client_name: 'Google',
      description: '',
      base_url: 'https://accounts.google.com',
      check: 'http_reachability',
      endpoint: 'https://accounts.google.com',
      healthy: true,
      status: 'reachable',
      response_time_ms: 210,
      last_checked: '2026-09-06T14:00:00Z',
      error_message: '',
    },
  ],
};

export const BRUTE_FORCE = {
  enabled: true,
  blocked: [
    { ip: '203.0.113.9', attempts: 1512 },
    { ip: '198.51.100.77', attempts: 1503 },
    { ip: '192.0.2.14', attempts: 1500 },
  ],
};

export const TERMS = [
  {
    name: 'privacy',
    friendly_name: 'Privacy Policy',
    icon: 'file-text',
    type: 'SITE',
    is_public: true,
    copies: [
      {
        id: 1,
        regions: [],
        version: '3.0',
        revision: 2,
        content:
          '## 1. Information We Collect\n\nWe collect information you provide directly to us…',
        created_by: 'mark@m4kr.net',
        updated_at: '2026-08-14T00:00:00Z',
      },
      {
        id: 5,
        regions: ['EEA', 'UK'],
        version: '3.0',
        revision: 1,
        content:
          '## 1. Information We Collect\n\nWe collect information you provide directly to us, as the GDPR and the UK GDPR allow…',
        created_by: 'mark@m4kr.net',
        updated_at: '2026-08-14T00:00:00Z',
      },
    ],
  },
  {
    name: 'terms',
    friendly_name: 'Terms of Service',
    icon: 'file-text',
    type: 'SITE',
    is_public: true,
    copies: [
      {
        id: 2,
        regions: [],
        version: '2.0',
        revision: 2,
        content: '## Terms\n\n…',
        created_by: 'mark@m4kr.net',
        updated_at: '2026-01-09T00:00:00Z',
      },
    ],
  },
  {
    name: 'conductor-msa',
    friendly_name: 'Master Services Agreement',
    icon: 'shield-lock',
    type: 'CLIENT',
    is_public: false,
    copies: [
      {
        id: 3,
        regions: [],
        version: '2.1',
        revision: 3,
        content:
          '## 1. Services\n\nProminic.NET, Inc. provides the Conductor platform to {{full_name}} …',
        created_by: 'mark@m4kr.net',
        updated_at: '2026-07-02T00:00:00Z',
      },
      {
        id: 4,
        regions: ['EU'],
        version: '2.1',
        revision: 1,
        content:
          '## 1. Services\n\nProminic.NET, Inc. provides the Conductor platform to {{full_name}} under the law of the European Union …',
        created_by: 'mark@m4kr.net',
        updated_at: '2026-07-02T00:00:00Z',
      },
    ],
  },
];

export const PLACEHOLDERS = [
  { name: 'first_name', scope: 'identity', description: 'The given name' },
  { name: 'last_name', scope: 'identity', description: 'The family name' },
  { name: 'full_name', scope: 'identity', description: 'The full name' },
  { name: 'email', scope: 'identity', description: 'The email address' },
  { name: 'phone', scope: 'identity', description: 'The mobile number' },
  { name: 'address', scope: 'address', description: 'The street address' },
  { name: 'country', scope: 'address', description: 'The country' },
  { name: 'state', scope: 'address', description: 'The state or region' },
  { name: 'city', scope: 'address', description: 'The city' },
  { name: 'postal_code', scope: 'address', description: 'The postal code' },
  { name: 'date', scope: 'document', description: 'The acceptance date' },
];

const seedCopy = (id, subject, body) => ({
  id,
  site: '',
  locale: '',
  version: '1.0',
  revision: 1,
  subject,
  body,
  created_by: 'seed',
  updated_at: '2026-09-01T00:00:00Z',
});

export const EMAIL_TEMPLATES = [
  {
    kind: 'account_verification',
    copies: [
      {
        ...seedCopy(
          1,
          'Verify your {2} account',
          '<p>Hello {0},</p>\n<p>Confirm your {2} account:</p>\n<p><a href="{1}">Verify</a></p>'
        ),
        revision: 2,
        updated_at: '2026-09-14T00:00:00Z',
      },
      {
        id: 2,
        site: 'prominic',
        locale: 'es',
        version: '1.0',
        revision: 1,
        subject: 'Verifica tu cuenta de {2}',
        body: '<p>Hola {0},</p>\n<p>Confirma tu cuenta de {2}:</p>\n<p><a href="{1}">Verificar</a></p>',
        created_by: 'mark@m4kr.net',
        updated_at: '2026-09-14T00:00:00Z',
      },
    ],
  },
  {
    kind: 'password_reset',
    copies: [
      seedCopy(
        4,
        'Reset your password',
        '<p>Hello {0},</p>\n<p><a href="{1}">Reset your password</a> within {2} minutes.</p>'
      ),
    ],
  },
  {
    kind: 'magic_login',
    copies: [
      seedCopy(
        5,
        'Your sign-in link',
        '<p>Hello {0},</p>\n<p><a href="{1}">Sign in</a> within {2} minutes.</p>'
      ),
    ],
  },
  {
    kind: 'onboarding_verification',
    copies: [seedCopy(6, 'Your verification code', '<p>Your code is <strong>{0}</strong>.</p>')],
  },
  {
    kind: 'org_invite',
    copies: [
      seedCopy(
        7,
        '{0} invited you to {1}',
        '<p>{0} invited you to join {1}.</p>\n<p><a href="{2}">Accept the invitation</a> within {3} days.</p>'
      ),
      {
        id: 3,
        site: 'startcloud',
        locale: '',
        version: '2.0',
        revision: 1,
        subject: '{0} invited you to {1}',
        body: '<p>{0} invited you to join {1}.</p>\n<p><a href="{2}">Accept the invitation</a> within {3} days.</p>',
        created_by: 'mark@m4kr.net',
        updated_at: '2026-08-30T00:00:00Z',
      },
    ],
  },
  {
    kind: 'email_change',
    copies: [
      seedCopy(8, 'Confirm your new email address', '<p>Your code is <strong>{0}</strong>.</p>'),
    ],
  },
  {
    kind: 'account_event',
    copies: [seedCopy(9, '{0}', '<p>{1}</p>\n<p>Questions? Write to {2}.</p>')],
  },
  {
    kind: 'ciba_approval',
    copies: [
      seedCopy(
        10,
        'Approve a sign-in from {0}',
        '<p>{0} asks to sign in.</p>\n<p><a href="{1}">Approve</a></p>\n<p>{2}</p>'
      ),
    ],
  },
  {
    kind: 'admin_new_registration',
    copies: [
      seedCopy(
        11,
        'New registration: {0}',
        '<p>{0} ({1}) registered at {2} from {3}, {4}.</p>\n<p><a href="{5}">Open the dashboard</a></p>'
      ),
    ],
  },
];

export const EMAIL_ARGUMENTS = [
  {
    kind: 'account_verification',
    arguments: [
      { index: 0, name: 'name', description: 'The recipient name' },
      { index: 1, name: 'link', description: 'The verification link' },
      { index: 2, name: 'company name', description: 'The site company name' },
    ],
  },
  {
    kind: 'password_reset',
    arguments: [
      { index: 0, name: 'name', description: 'The recipient name' },
      { index: 1, name: 'link', description: 'The reset link' },
      { index: 2, name: 'expiry minutes', description: 'Minutes until the link expires' },
    ],
  },
  {
    kind: 'magic_login',
    arguments: [
      { index: 0, name: 'name', description: 'The recipient name' },
      { index: 1, name: 'link', description: 'The sign-in link' },
      { index: 2, name: 'expiry minutes', description: 'Minutes until the link expires' },
    ],
  },
  {
    kind: 'onboarding_verification',
    arguments: [{ index: 0, name: 'code', description: 'The verification code' }],
  },
  {
    kind: 'org_invite',
    arguments: [
      { index: 0, name: 'inviter name', description: 'Who sent the invitation' },
      { index: 1, name: 'organization name', description: 'The organization invited to' },
      { index: 2, name: 'invite link', description: 'The invitation link' },
      { index: 3, name: 'expiry days', description: 'Days until the invitation expires' },
    ],
  },
  {
    kind: 'email_change',
    arguments: [{ index: 0, name: 'code', description: 'The verification code' }],
  },
  {
    kind: 'account_event',
    arguments: [
      { index: 0, name: 'event title', description: 'The event title' },
      { index: 1, name: 'event message', description: 'The event message' },
      { index: 2, name: 'support email', description: 'The support address' },
    ],
  },
  {
    kind: 'ciba_approval',
    arguments: [
      { index: 0, name: 'client name', description: 'The application asking' },
      { index: 1, name: 'approval link', description: 'The approval link' },
      { index: 2, name: 'binding message', description: 'The binding message' },
    ],
  },
  {
    kind: 'admin_new_registration',
    arguments: [
      { index: 0, name: 'user name', description: 'The new account name' },
      { index: 1, name: 'user email', description: 'The new account email' },
      { index: 2, name: 'timestamp', description: 'When the account registered' },
      { index: 3, name: 'IP address', description: 'The registering address' },
      { index: 4, name: 'location', description: 'The registering location' },
      { index: 5, name: 'dashboard link', description: 'The admin dashboard link' },
    ],
  },
];

export const SITES_CONFIG = {
  sites: {
    default_site: 'startcloud',
    sites: {
      startcloud: { name: 'STARTcloud' },
      prominic: { name: 'Prominic' },
      moonshinedev: { name: 'Moonshine Dev' },
    },
  },
};
