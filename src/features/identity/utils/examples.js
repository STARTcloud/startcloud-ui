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
        locale: '',
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
        locale: '',
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
        locale: '',
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
        locale: '',
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
        locale: '',
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
  {
    name: 'effective_date',
    scope: 'document',
    description: "The date of the acceptance in the person's time zone and the document's language",
  },
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

const TOKEN_DESCRIPTIONS = {
  site_name: 'The site name',
  support_email: 'The support address',
  new_email: 'The new email address',
  phone: 'The phone number',
  app_name: 'The authenticator app name',
  method: 'The method disabled',
  client_name: 'The application',
  time: 'When it happened',
  scope: 'The permission removed',
  document_name: 'The document name',
  version: 'The new version',
  organization_name: 'The name of the organization',
  role: 'The new role',
  inviter: 'The name of the person who sent the invitation',
  owner_name: 'The name of the new owner',
  person_name: 'The name of the person asking to join',
  passkey_name: 'The passkey name',
  approval_link: 'The approval link',
};

const plainKind = (id, kind, family, subject, body, tokens) => ({
  id,
  kind,
  family,
  subject,
  body,
  tokens,
});

const accountEventKind = (id, kind, subject, body, tokens) =>
  plainKind(id, kind, 'email', subject, body, tokens);

const noticeKind = (id, kind, subject, body, tokens) =>
  plainKind(id, kind, 'notification', subject, body, tokens);

const FAMILY_KINDS = [
  accountEventKind(
    20,
    'account_event_email_changed',
    'Your email address changed',
    'Your {{site_name}} email address is now {{new_email}}. If this was not you, write to {{support_email}}.',
    ['site_name', 'new_email', 'support_email']
  ),
  accountEventKind(
    21,
    'account_event_phone_changed',
    'Your phone number changed',
    'Your {{site_name}} phone number is now {{phone}}.',
    ['site_name', 'phone']
  ),
  accountEventKind(
    22,
    'account_event_phone_removed',
    'Your phone number was removed',
    'The phone number {{phone}} was removed from your {{site_name}} account.',
    ['site_name', 'phone']
  ),
  accountEventKind(
    23,
    'account_event_app_removed',
    'An authenticator app was removed',
    'The authenticator app {{app_name}} was removed from your {{site_name}} account.',
    ['site_name', 'app_name']
  ),
  accountEventKind(
    24,
    'account_event_contact_phone_changed',
    'Your contact phone changed',
    'Your {{site_name}} contact phone is now {{phone}}.',
    ['site_name', 'phone']
  ),
  accountEventKind(
    25,
    'account_event_password_change_required',
    'A password change is required',
    'An administrator asks you to change your {{site_name}} password at your next sign-in.',
    ['site_name']
  ),
  noticeKind(
    26,
    'notify_tfa_method_disabled',
    'Two-factor method disabled',
    '{{method}} was disabled by its lockout.',
    ['method']
  ),
  noticeKind(
    27,
    'notify_session_revoked',
    'Session revoked',
    'Your {{client_name}} session ended.',
    ['client_name']
  ),
  noticeKind(
    28,
    'notify_backup_codes_generated',
    'Backup codes generated',
    'New backup codes were generated at {{time}}; the old ones no longer work.',
    ['time']
  ),
  noticeKind(
    29,
    'notify_tfa_enabled',
    'Two-factor sign-in enabled',
    'Two-factor sign-in is on for your {{site_name}} account.',
    ['site_name']
  ),
  noticeKind(
    30,
    'notify_tfa_disabled',
    'Two-factor sign-in disabled',
    'Two-factor sign-in is off for your {{site_name}} account.',
    ['site_name']
  ),
  noticeKind(
    31,
    'notify_sessions_revoked_all',
    'All sessions revoked',
    'Every session of your {{site_name}} account ended.',
    ['site_name']
  ),
  noticeKind(
    32,
    'notify_password_changed',
    'Password changed',
    'Your {{site_name}} password was changed at {{time}}.',
    ['site_name', 'time']
  ),
  noticeKind(
    33,
    'notify_app_access_revoked',
    'Application access revoked',
    '{{client_name}} no longer has access to your account.',
    ['client_name']
  ),
  noticeKind(
    34,
    'notify_app_permission_removed',
    'Application permission removed',
    '{{client_name}} lost the permission {{scope}}.',
    ['client_name', 'scope']
  ),
  noticeKind(
    35,
    'notify_tos_updated',
    'Terms updated',
    '{{document_name}} changed to version {{version}}; you are asked to accept it at your next sign-in.',
    ['document_name', 'version']
  ),
  noticeKind(
    36,
    'notify_org_role_changed',
    'Organization role changed',
    'Your role in {{organization_name}} is now {{role}}.',
    ['organization_name', 'role']
  ),
  noticeKind(
    37,
    'notify_org_invited',
    'Organization invitation',
    '{{inviter}} invited you to {{organization_name}}.',
    ['inviter', 'organization_name']
  ),
  noticeKind(
    38,
    'notify_org_deleted',
    'Organization deleted',
    '{{organization_name}} was deleted.',
    ['organization_name']
  ),
  noticeKind(
    39,
    'notify_org_ownership_transferred',
    'Organization ownership transferred',
    '{{organization_name}} is now owned by {{owner_name}}.',
    ['organization_name', 'owner_name']
  ),
  noticeKind(
    40,
    'notify_org_join_requested',
    'Join request',
    '{{person_name}} asks to join {{organization_name}}.',
    ['person_name', 'organization_name']
  ),
  noticeKind(
    41,
    'notify_org_join_approved',
    'Join request approved',
    'Your request to join {{organization_name}} was approved.',
    ['organization_name']
  ),
  noticeKind(
    42,
    'notify_org_join_denied',
    'Join request denied',
    'Your request to join {{organization_name}} was denied.',
    ['organization_name']
  ),
  noticeKind(
    43,
    'notify_email_changed',
    'Email address changed',
    'Your email address is now {{new_email}}.',
    ['new_email']
  ),
  noticeKind(
    44,
    'notify_phone_changed',
    'Phone number changed',
    'Your phone number is now {{phone}}.',
    ['phone']
  ),
  noticeKind(
    45,
    'notify_phone_removed',
    'Phone number removed',
    'The phone number {{phone}} was removed.',
    ['phone']
  ),
  noticeKind(
    46,
    'notify_app_removed',
    'Authenticator app removed',
    'The authenticator app {{app_name}} was removed.',
    ['app_name']
  ),
  noticeKind(
    47,
    'notify_contact_phone_changed',
    'Contact phone changed',
    'Your contact phone is now {{phone}}.',
    ['phone']
  ),
  noticeKind(
    48,
    'notify_passkey_added',
    'Passkey added',
    'The passkey {{passkey_name}} was added.',
    ['passkey_name']
  ),
  noticeKind(
    49,
    'notify_passkey_removed',
    'Passkey removed',
    'The passkey {{passkey_name}} was removed.',
    ['passkey_name']
  ),
  noticeKind(
    50,
    'notify_password_change_required',
    'Password change required',
    'Change your {{site_name}} password at your next sign-in.',
    ['site_name']
  ),
  noticeKind(
    51,
    'notify_ciba_approval',
    'Sign-in request',
    '{{client_name}} is asking to sign you in. Review the request: {{approval_link}}',
    ['client_name', 'approval_link']
  ),
  plainKind(
    52,
    'sms_ciba_approval',
    'sms',
    '',
    '{{client_name}} is asking to sign you in. Review the request: {{approval_link}}',
    ['client_name', 'approval_link']
  ),
];

export const EMAIL_TEMPLATES = [
  {
    kind: 'account_verification',
    family: 'email',
    copies: [
      {
        ...seedCopy(
          1,
          'Verify your {{company_name}} account',
          '<p>Hello {{name}},</p>\n<p>Confirm your {{company_name}} account:</p>\n<p><a href="{{link}}">Verify</a></p>'
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
        subject: 'Verifica tu cuenta de {{company_name}}',
        body: '<p>Hola {{name}},</p>\n<p>Confirma tu cuenta de {{company_name}}:</p>\n<p><a href="{{link}}">Verificar</a></p>',
        created_by: 'mark@m4kr.net',
        updated_at: '2026-09-14T00:00:00Z',
      },
    ],
  },
  {
    kind: 'password_reset',
    family: 'email',
    copies: [
      seedCopy(
        4,
        'Reset your password',
        '<p>Hello {{name}},</p>\n<p><a href="{{link}}">Reset your password</a> within {{expiry_minutes}} minutes.</p>'
      ),
    ],
  },
  {
    kind: 'magic_login',
    family: 'email',
    copies: [
      seedCopy(
        5,
        'Your sign-in link',
        '<p>Hello {{name}},</p>\n<p><a href="{{link}}">Sign in</a> within {{expiry_minutes}} minutes.</p>'
      ),
    ],
  },
  {
    kind: 'onboarding_verification',
    family: 'email',
    copies: [
      seedCopy(6, 'Your verification code', '<p>Your code is <strong>{{code}}</strong>.</p>'),
    ],
  },
  {
    kind: 'org_invite',
    family: 'email',
    copies: [
      seedCopy(
        7,
        '{{inviter}} invited you to {{organization_name}}',
        '<p>{{inviter}} invited you to join {{organization_name}}.</p>\n<p><a href="{{link}}">Accept the invitation</a> within {{expiry_days}} days.</p>'
      ),
      {
        id: 3,
        site: 'startcloud',
        locale: '',
        version: '2.0',
        revision: 1,
        subject: '{{inviter}} invited you to {{organization_name}}',
        body: '<p>{{inviter}} invited you to join {{organization_name}}.</p>\n<p><a href="{{link}}">Accept the invitation</a> within {{expiry_days}} days.</p>',
        created_by: 'mark@m4kr.net',
        updated_at: '2026-08-30T00:00:00Z',
      },
    ],
  },
  {
    kind: 'email_change',
    family: 'email',
    copies: [
      seedCopy(
        8,
        'Confirm your new email address',
        '<p>Your code is <strong>{{code}}</strong>.</p>'
      ),
    ],
  },
  {
    kind: 'account_event',
    family: 'email',
    copies: [
      seedCopy(9, '{{title}}', '<p>{{message}}</p>\n<p>Questions? Write to {{support_email}}.</p>'),
    ],
  },
  {
    kind: 'ciba_approval',
    family: 'email',
    copies: [
      seedCopy(
        10,
        'Approve a sign-in from {{client_name}}',
        '<p>{{client_name}} asks to sign in.</p>\n<p><a href="{{approval_link}}">Approve</a></p>\n<p>{{binding_message}}</p>'
      ),
    ],
  },
  {
    kind: 'admin_new_registration',
    family: 'email',
    copies: [
      seedCopy(
        11,
        'New registration: {{user_name}}',
        '<p>{{user_name}} ({{email}}) registered at {{timestamp}} from {{ip}}, {{location}}.</p>\n<p><a href="{{dashboard_link}}">Open the dashboard</a></p>'
      ),
    ],
  },
  {
    kind: 'account_suspended',
    family: 'email',
    copies: [
      seedCopy(
        12,
        'Your {{site_name}} account is suspended',
        '<p>Your {{site_name}} account is suspended.</p>\n<p>Questions? Write to {{support_email}}.</p>'
      ),
    ],
  },
  {
    kind: 'org_membership_suspended',
    family: 'email',
    copies: [
      seedCopy(
        13,
        'Your membership of {{organization_name}} is suspended',
        '<p>Your membership of {{organization_name}} is suspended.</p>'
      ),
    ],
  },
  {
    kind: 'smtp_test',
    family: 'email',
    copies: [
      seedCopy(
        14,
        'SMTP test message',
        '<p>This message was sent through {{host}}:{{port}} as {{username}}.</p>\n<p>STARTTLS {{starttls}}, implicit TLS {{implicit_tls}}, authentication {{authentication}}.</p>\n<p>From {{from_name}} ({{from_address}}).</p>'
      ),
    ],
  },
  {
    kind: 'sign_in_notice',
    family: 'email',
    copies: [
      seedCopy(
        15,
        'New sign-in to your {{site_name}} account',
        '<p>Hello {{name}},</p>\n<p>Your account signed in at {{time}} from {{ip}}, {{location}}, with {{browser}} ({{method}}).</p>\n<p><a href="{{sessions_link}}">Review your sessions</a> or write to {{support_email}}.</p>'
      ),
    ],
  },
  {
    kind: 'device_approval_notice',
    family: 'email',
    copies: [
      seedCopy(
        16,
        'A device code was approved on {{site_name}}',
        '<p>Hello {{name}},</p>\n<p>A device code of {{client_name}} was approved at {{time}} from {{ip}}, {{location}}, with {{browser}} ({{method}}).</p>\n<p><a href="{{sessions_link}}">Review your sessions</a> or write to {{support_email}}.</p>'
      ),
    ],
  },
  {
    kind: 'ciba_approval_notice',
    family: 'email',
    copies: [
      seedCopy(
        17,
        'A sign-in request was approved on {{site_name}}',
        '<p>Hello {{name}},</p>\n<p>A sign-in request of {{client_name}} was approved at {{time}} from {{ip}}, {{location}}, with {{browser}} ({{method}}).</p>\n<p><a href="{{sessions_link}}">Review your sessions</a> or write to {{support_email}}.</p>'
      ),
    ],
  },
  {
    kind: 'sign_in_notice_changed',
    family: 'email',
    copies: [
      seedCopy(
        18,
        'Your {{site_name}} sign-in notices changed',
        '<p>Hello {{name}},</p>\n<p>Sign-in notices: {{when}}. Channels: {{channels}}.</p>\n<p>Questions? Write to {{support_email}}.</p>'
      ),
    ],
  },
  {
    kind: 'sign_in_email_code',
    family: 'email',
    copies: [
      seedCopy(
        19,
        'Your {{site_name}} sign-in code',
        '<p>Hello {{name}},</p>\n<p>Your code is <strong>{{code}}</strong>. It expires in {{expiry_minutes}} minutes.</p>\n<p>Questions? Write to {{support_email}}.</p>'
      ),
    ],
  },
  ...FAMILY_KINDS.map(entry => ({
    kind: entry.kind,
    family: entry.family,
    copies: [seedCopy(entry.id, entry.subject, entry.body)],
  })),
];

const NOTICE_ARGUMENTS = [
  { name: 'name', description: 'The recipient name' },
  { name: 'time', description: 'When it happened' },
  { name: 'ip', description: 'The address it came from' },
  { name: 'location', description: 'The location of that address' },
  { name: 'browser', description: 'The browser and operating system' },
  { name: 'method', description: 'The method names of the session' },
  { name: 'site_name', description: 'The site name' },
  { name: 'sessions_link', description: 'The link to the account sessions' },
  { name: 'support_email', description: 'The support address' },
];

const APPROVAL_ARGUMENTS = [
  ...NOTICE_ARGUMENTS,
  { name: 'client_name', description: 'The application approved' },
];

export const EMAIL_ARGUMENTS = [
  {
    kind: 'account_verification',
    family: 'email',
    arguments: [
      { name: 'name', description: 'The recipient name' },
      { name: 'link', description: 'The verification link' },
      { name: 'company_name', description: 'The site company name' },
    ],
  },
  {
    kind: 'password_reset',
    family: 'email',
    arguments: [
      { name: 'name', description: 'The recipient name' },
      { name: 'link', description: 'The reset link' },
      { name: 'expiry_minutes', description: 'Minutes until the link expires' },
    ],
  },
  {
    kind: 'magic_login',
    family: 'email',
    arguments: [
      { name: 'name', description: 'The recipient name' },
      { name: 'link', description: 'The sign-in link' },
      { name: 'expiry_minutes', description: 'Minutes until the link expires' },
    ],
  },
  {
    kind: 'onboarding_verification',
    family: 'email',
    arguments: [{ name: 'code', description: 'The verification code' }],
  },
  {
    kind: 'org_invite',
    family: 'email',
    arguments: [
      { name: 'inviter', description: 'The name of the person who sent the invitation' },
      { name: 'organization_name', description: 'The name of the organization' },
      { name: 'link', description: 'The invitation link' },
      { name: 'expiry_days', description: 'Days until the invitation expires' },
    ],
  },
  {
    kind: 'email_change',
    family: 'email',
    arguments: [{ name: 'code', description: 'The verification code' }],
  },
  {
    kind: 'account_event',
    family: 'email',
    arguments: [
      { name: 'title', description: 'The event title' },
      { name: 'message', description: 'The event message' },
      { name: 'support_email', description: 'The support address' },
    ],
  },
  {
    kind: 'ciba_approval',
    family: 'email',
    arguments: [
      { name: 'client_name', description: 'The application asking' },
      { name: 'approval_link', description: 'The approval link' },
      { name: 'binding_message', description: 'The binding message' },
    ],
  },
  {
    kind: 'admin_new_registration',
    family: 'email',
    arguments: [
      { name: 'user_name', description: 'The new account name' },
      { name: 'email', description: 'The new account email' },
      { name: 'timestamp', description: 'When the account registered' },
      { name: 'ip', description: 'The registering address' },
      { name: 'location', description: 'The registering location' },
      { name: 'dashboard_link', description: 'The admin dashboard link' },
    ],
  },
  {
    kind: 'account_suspended',
    family: 'email',
    arguments: [
      { name: 'site_name', description: 'The site name' },
      { name: 'support_email', description: 'The support address' },
    ],
  },
  {
    kind: 'org_membership_suspended',
    family: 'email',
    arguments: [{ name: 'organization_name', description: 'The name of the organization' }],
  },
  {
    kind: 'smtp_test',
    family: 'email',
    arguments: [
      { name: 'host', description: 'The SMTP host' },
      { name: 'port', description: 'The SMTP port' },
      { name: 'username', description: 'The SMTP user name' },
      { name: 'starttls', description: 'Whether STARTTLS is on' },
      { name: 'implicit_tls', description: 'Whether implicit TLS is on' },
      { name: 'authentication', description: 'Whether authentication is on' },
      { name: 'from_address', description: 'The sender address' },
      { name: 'from_name', description: 'The sender name' },
    ],
  },
  { kind: 'sign_in_notice', family: 'email', arguments: NOTICE_ARGUMENTS },
  { kind: 'device_approval_notice', family: 'email', arguments: APPROVAL_ARGUMENTS },
  { kind: 'ciba_approval_notice', family: 'email', arguments: APPROVAL_ARGUMENTS },
  {
    kind: 'sign_in_notice_changed',
    family: 'email',
    arguments: [
      { name: 'name', description: 'The recipient name' },
      { name: 'when', description: 'When notices are sent after the change' },
      { name: 'channels', description: 'The channels after the change' },
      { name: 'site_name', description: 'The site name' },
      { name: 'support_email', description: 'The support address' },
    ],
  },
  {
    kind: 'sign_in_email_code',
    family: 'email',
    arguments: [
      { name: 'name', description: 'The recipient name' },
      { name: 'code', description: 'The sign-in code' },
      { name: 'expiry_minutes', description: 'Minutes until the code expires' },
      { name: 'site_name', description: 'The site name' },
      { name: 'support_email', description: 'The support address' },
    ],
  },
  ...FAMILY_KINDS.map(entry => ({
    kind: entry.kind,
    family: entry.family,
    arguments: entry.tokens.map(name => ({ name, description: TOKEN_DESCRIPTIONS[name] })),
  })),
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
