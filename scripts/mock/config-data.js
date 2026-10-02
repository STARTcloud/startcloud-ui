const SCHEMA = 'https://json-schema.org/draft/2020-12/schema';
const LEVELS = ['error', 'warn', 'info', 'debug'];
const LISTENER_REASON = 'the listener is bound at boot';
const POOL_REASON = 'the connection pool is opened at boot';
const VERSION = { type: 'integer', readOnly: true, default: 1, title: 'Schema version' };

const leaf = (type, title, more = {}) => ({ type, title, ...more });

const text = (title, more = {}) => leaf('string', title, more);

const whole = (title, more = {}) => leaf('integer', title, more);

const flag = (title, more = {}) => leaf('boolean', title, more);

const port = (title, more = {}) => whole(title, { minimum: 1, maximum: 65535, ...more });

const group = ({ section, subsection, title, properties, more = {} }) => ({
  type: 'object',
  section,
  subsection,
  title,
  properties,
  ...more,
});

const action = (kind, route, body, stepUp = false) => ({
  kind,
  route,
  method: 'POST',
  body,
  step_up: stepUp,
});

const schema = ({ title, sections, properties }) => ({
  $schema: SCHEMA,
  title,
  schemaVersion: 1,
  sections,
  properties: { schemaVersion: VERSION, ...properties },
});

const APP_SCHEMA = schema({
  title: 'Application',
  sections: {
    server: { title: 'Server', order: 1 },
    agents: { title: 'Agents', order: 2 },
    logging: { title: 'Logging', order: 3 },
  },
  properties: {
    server: group({
      section: 'server',
      subsection: 'listener',
      title: 'Listener',
      more: { required: ['hostname', 'port'], order: 1 },
      properties: {
        hostname: text('Hostname', {
          format: 'hostname',
          description: 'The name the server answers under.',
          order: 1,
          requiresRestart: true,
          restartReason: LISTENER_REASON,
        }),
        port: port('HTTPS port', {
          default: 3443,
          order: 2,
          requiresRestart: true,
          restartReason: LISTENER_REASON,
        }),
        address: text('Listen address', { format: 'ipv4', default: '0.0.0.0', order: 3 }),
        origin: text('Origin', {
          format: 'uri',
          description: 'The URL people open, the one the provider redirects to.',
          order: 4,
        }),
        trust_proxy: flag('Trust the proxy headers', { default: false, order: 5 }),
        datacenter_label: text('Datacenter label', { order: 6 }),
      },
    }),
    cors: group({
      section: 'server',
      subsection: 'cors',
      title: 'Cross-origin requests',
      more: { order: 2 },
      properties: {
        allowed_origins: leaf('array', 'Allowed origins', {
          items: { type: 'string', format: 'uri' },
          orderable: true,
          description: 'Checked in the order drawn.',
          order: 1,
        }),
        methods: leaf('array', 'Allowed methods', {
          items: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
          order: 2,
        }),
        max_age: text('Preflight lifetime', { format: 'duration', default: 'PT1H', order: 3 }),
      },
    }),
    sessions: group({
      section: 'server',
      subsection: 'sessions',
      title: 'Sessions',
      more: { order: 3 },
      properties: {
        ttl: text('Session lifetime', { format: 'ttl', default: '30m', order: 1 }),
        secret: text('Signing secret', { writeOnly: true, order: 2 }),
        cookie_name: text('Cookie name', {
          deprecated: true,
          description: 'The session rides a header now.',
          order: 3,
        }),
      },
    }),
    agents: group({
      section: 'agents',
      subsection: 'requests',
      title: 'Requests to the agents',
      properties: {
        request_timeout: text('Request timeout', { format: 'ttl', default: '30s', order: 1 }),
        allow_insecure: flag('Accept self-signed certificates', { default: false, order: 2 }),
        retry_mode: text('Retry', {
          enum: ['none', 'fixed', 'backoff'],
          default: 'none',
          order: 3,
        }),
        retry_delay: text('Retry delay', {
          format: 'ttl',
          default: '5s',
          dependsOn: 'retry_mode',
          showWhen: ['fixed', 'backoff'],
          order: 4,
        }),
        tags: leaf('array', 'Tags offered', { items: { type: 'string' }, order: 5 }),
        weights: leaf('array', 'Priority weights', { items: { type: 'integer' }, order: 6 }),
      },
    }),
    logging: group({
      section: 'logging',
      subsection: 'logging',
      title: 'Log files',
      more: { action: action('run', '/api/config/app/run/rotate-logs', 'none', true) },
      properties: {
        level: text('Log level', { enum: LEVELS, default: 'info', order: 1 }),
        directory: text('Log directory', { default: '/var/log/hyperweaver-server', order: 2 }),
        keep_for: text('Keep for', { format: 'duration', default: 'P7D', order: 3 }),
        categories: {
          type: 'object',
          title: 'Log categories',
          propertyNames: { type: 'string', pattern: '^[a-z][a-z0-9_]*$' },
          additionalProperties: { type: 'string', enum: LEVELS },
        },
      },
    }),
  },
});

const PROVIDER_ITEM = {
  type: 'object',
  title: 'Provider',
  required: ['display_name', 'issuer', 'client_id'],
  action: action('test', '/api/config/auth/test', 'form'),
  properties: {
    display_name: text('Display name', { order: 1 }),
    issuer: text('Issuer', { format: 'uri', order: 2 }),
    client_id: text('Client id', { order: 3 }),
    client_secret: text('Client secret', { writeOnly: true, order: 4 }),
    scope: text('Scope', { default: 'openid profile email', order: 5 }),
    enabled: flag('Enabled', { default: true, order: 6 }),
  },
};

const AUTH_SCHEMA = schema({
  title: 'Authentication',
  sections: {
    local: { title: 'Local accounts', order: 1 },
    oidc: { title: 'Identity providers', order: 2 },
  },
  properties: {
    local: group({
      section: 'local',
      subsection: 'passwords',
      title: 'Passwords',
      properties: {
        enabled: flag('Local accounts', { default: true, order: 1 }),
        registration_enabled: flag('People may register', { default: false, order: 2 }),
        password_min_length: whole('Least password length', {
          minimum: 15,
          maximum: 128,
          default: 15,
          order: 3,
        }),
        token_ttl: text('Token lifetime', { format: 'ttl', default: '1h', order: 4 }),
        jwt_secret: text('Token secret', {
          writeOnly: true,
          order: 5,
          requiresRestart: true,
          restartReason: 'every token is signed with the secret read at boot',
        }),
      },
    }),
    oidc: group({
      section: 'oidc',
      subsection: 'providers',
      title: 'Providers',
      properties: {
        default_provider: text('Default provider', { order: 1 }),
        silent_login: flag('Try a silent sign-in first', { default: false, order: 2 }),
        providers: {
          type: 'object',
          title: 'Providers',
          propertyNames: { type: 'string', pattern: '^[a-z0-9_]+$' },
          additionalProperties: PROVIDER_ITEM,
        },
      },
    }),
  },
});

const DB_SCHEMA = schema({
  title: 'Database',
  sections: {
    database: {
      title: 'Database',
      order: 1,
      action: action('test', '/api/config/db/test', 'form'),
    },
  },
  properties: {
    database: group({
      section: 'database',
      subsection: 'connection',
      title: 'Connection',
      more: { required: ['dialect'], order: 1 },
      properties: {
        dialect: text('Dialect', {
          enum: ['sqlite', 'postgres', 'mysql'],
          default: 'sqlite',
          order: 1,
          requiresRestart: true,
          restartReason: POOL_REASON,
        }),
        storage: text('Database file', {
          dependsOn: 'dialect',
          showWhen: ['sqlite'],
          default: '/var/lib/hyperweaver-server/database.sqlite',
          order: 2,
        }),
        host: text('Host', {
          format: 'hostname',
          dependsOn: 'dialect',
          showWhen: ['postgres', 'mysql'],
          order: 3,
        }),
        port: port('Port', { dependsOn: 'dialect', showWhen: ['postgres', 'mysql'], order: 4 }),
        name: text('Database name', {
          dependsOn: 'dialect',
          showWhen: ['postgres', 'mysql'],
          order: 5,
        }),
        user: text('User', { dependsOn: 'dialect', showWhen: ['postgres', 'mysql'], order: 6 }),
        password: text('Password', {
          writeOnly: true,
          dependsOn: 'dialect',
          showWhen: ['postgres', 'mysql'],
          order: 7,
        }),
        ca_file: text('Certificate authority', {
          description: 'A PEM file the database certificate is checked against.',
          action: action('upload', '/api/config/db/upload', 'file'),
          order: 8,
        }),
      },
    }),
    pool: group({
      section: 'database',
      subsection: 'pool',
      title: 'Connection pool',
      more: { order: 2 },
      properties: {
        max: whole('Most connections', {
          minimum: 1,
          maximum: 100,
          default: 5,
          order: 1,
          requiresRestart: true,
          restartReason: POOL_REASON,
        }),
        idle: text('Idle time', { format: 'ttl', default: '10s', order: 2 }),
      },
    }),
  },
});

const MAIL_SCHEMA = schema({
  title: 'Mail',
  sections: {
    smtp: {
      title: 'Mail server',
      order: 1,
      action: action('test', '/api/config/mail/test', 'form'),
    },
    alerts: { title: 'Alerts', order: 2 },
  },
  properties: {
    smtp: group({
      section: 'smtp',
      subsection: 'server',
      title: 'Server',
      more: { required: ['host', 'port', 'from'] },
      properties: {
        host: text('Host', { format: 'hostname', order: 1 }),
        port: port('Port', { default: 587, order: 2 }),
        secure: flag('Use TLS from the start', { default: false, order: 3 }),
        user: text('User', { order: 4 }),
        password: text('Password', { writeOnly: true, order: 5 }),
        from: text('From address', { order: 6 }),
      },
    }),
    alerts: group({
      section: 'alerts',
      subsection: 'alerts',
      title: 'Alert mail',
      properties: {
        recipients: leaf('array', 'Recipients', { items: { type: 'string' }, order: 1 }),
        levels: leaf('array', 'Levels sent', {
          items: { type: 'string', enum: LEVELS },
          order: 2,
        }),
        headers: {
          type: 'object',
          title: 'Extra headers',
          propertyNames: { type: 'string', pattern: '^[A-Za-z][A-Za-z0-9-]*$' },
          additionalProperties: { type: 'string' },
        },
        templates: {
          type: 'object',
          title: 'Subject lines per language',
          propertyNames: { type: 'string', pattern: '^[a-z_]+$' },
          additionalProperties: {
            type: 'object',
            title: 'Subject lines',
            propertyNames: { type: 'string', pattern: '^[a-z]{2}$' },
            additionalProperties: { type: 'string' },
          },
        },
      },
    }),
  },
});

const APP_FILE = {
  schemaVersion: 1,
  server: {
    hostname: 'hyperweaver.example.com',
    port: 3443,
    address: '0.0.0.0',
    origin: 'https://hyperweaver.example.com',
    trust_proxy: true,
    datacenter_label: 'Example Datacenter',
  },
  cors: {
    allowed_origins: ['https://hyperweaver.example.com', 'https://lab.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    max_age: 'PT1H',
  },
  sessions: { ttl: '30m', secret: 'an-example-secret-of-no-value', cookie_name: 'hyperweaver' },
  agents: {
    request_timeout: '30s',
    allow_insecure: false,
    retry_mode: 'backoff',
    retry_delay: '5s',
    tags: ['lab', 'production', 'field'],
    weights: [100, 80, 60],
  },
  logging: {
    level: 'info',
    directory: '/var/log/hyperweaver-server',
    keep_for: 'P7D',
    categories: { app: 'info', api: 'warn', agents: 'debug', auth: 'info' },
  },
};

const AUTH_FILE = {
  schemaVersion: 1,
  local: {
    enabled: true,
    registration_enabled: true,
    password_min_length: 15,
    token_ttl: '1h',
    jwt_secret: 'an-example-secret-of-no-value',
  },
  oidc: {
    default_provider: 'startcloud',
    silent_login: false,
    providers: {
      startcloud: {
        display_name: 'STARTcloud',
        issuer: 'https://auth.example.com',
        client_id: 'hyperweaver',
        client_secret: 'an-example-secret-of-no-value',
        scope: 'openid profile email organizations notifications:read',
        enabled: true,
      },
      github: {
        display_name: 'GitHub',
        issuer: 'https://github.example.com',
        client_id: 'hyperweaver-github',
        client_secret: 'an-example-secret-of-no-value',
        scope: 'openid profile email',
        enabled: true,
      },
      okta: {
        display_name: 'Okta',
        issuer: 'https://okta.example.com',
        client_id: 'hyperweaver-okta',
        client_secret: '',
        scope: 'openid profile email',
        enabled: false,
      },
    },
  },
};

const DB_FILE = {
  schemaVersion: 1,
  database: {
    dialect: 'sqlite',
    storage: '/var/lib/hyperweaver-server/database.sqlite',
    host: 'db.example.com',
    port: 5432,
    name: 'hyperweaver',
    user: 'hyperweaver',
    password: 'an-example-secret-of-no-value',
    ca_file: '',
  },
  pool: { max: 5, idle: '10s' },
};

const MAIL_FILE = {
  schemaVersion: 1,
  smtp: {
    host: 'mail.example.com',
    port: 587,
    secure: false,
    user: 'hyperweaver',
    password: 'an-example-secret-of-no-value',
    from: 'hyperweaver@example.com',
  },
  alerts: {
    recipients: ['ops@example.com', 'oncall@example.com'],
    levels: ['error', 'warn'],
    headers: { 'X-Environment': 'example', 'X-Team': 'operations' },
    templates: {
      task_failed: { en: 'A task failed', de: 'Eine Aufgabe ist fehlgeschlagen' },
      host_down: { en: 'A host is unreachable', de: 'Ein Host ist nicht erreichbar' },
    },
  },
};

/**
 * The configuration files of the mock and their schemas, mock data in the
 * config contract's schema words so every control the shared
 * Configuration page knows is drawn: sections and subsections, the
 * restart badge, a secret, a deprecated leaf, a leaf shown only while a
 * sibling holds a value, an orderable list, a comma list, a multi-select,
 * the two duration formats, a map of scalars, a map of objects, a map of
 * maps, and the three action kinds.
 */
export const CONFIG_SCHEMAS = {
  app: APP_SCHEMA,
  auth: AUTH_SCHEMA,
  db: DB_SCHEMA,
  mail: MAIL_SCHEMA,
};

export const CONFIG_FILES = { app: APP_FILE, auth: AUTH_FILE, db: DB_FILE, mail: MAIL_FILE };

export const CONFIG_NAMES = Object.keys(CONFIG_FILES);
