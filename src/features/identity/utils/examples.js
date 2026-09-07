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
      healthy: true,
      status: 'healthy',
      response_time_ms: 142,
      last_checked: '2026-09-06T14:00:00Z',
      error_message: '',
    },
    {
      client_id: 'boxvault',
      client_name: 'BoxVault',
      description: '',
      base_url: 'https://boxvault.startcloud.com',
      healthy: false,
      status: 'unhealthy',
      response_time_ms: null,
      last_checked: '2026-09-06T14:00:00Z',
      error_message: 'timed out',
    },
    {
      client_id: 'switchboard-desktop',
      client_name: 'SwitchBoard Desktop',
      description: '',
      base_url: 'swb://app/home',
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
      healthy: true,
      status: 'healthy',
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
    version: '3.0',
    type: 'site',
    is_public: true,
    display_order: 10,
    content: '## 1. Information We Collect\n\nWe collect information you provide directly to us…',
    created_by: 'mark@m4kr.net',
    updated_at: '2026-08-14T00:00:00Z',
  },
  {
    name: 'terms',
    friendly_name: 'Terms of Service',
    icon: 'file-text',
    version: '2.0',
    type: 'site',
    is_public: true,
    display_order: 20,
    content: '## Terms\n\n…',
    created_by: 'mark@m4kr.net',
    updated_at: '2026-01-09T00:00:00Z',
  },
  {
    name: 'conductor-msa',
    friendly_name: 'Master Services Agreement',
    icon: 'shield-lock',
    version: '2.1',
    type: 'client',
    is_public: false,
    display_order: 100,
    content:
      '## 1. Services\n\nProminic.NET, Inc. provides the Conductor platform to {{full_name}} …',
    created_by: 'mark@m4kr.net',
    updated_at: '2026-07-02T00:00:00Z',
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
