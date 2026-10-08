import { createHash, randomUUID } from 'crypto';

import { APIKEY_MODE, ORG_UUIDS, ago, now, payloadOf, unsignedJwt } from './kit.js';

const HOUR_S = 3600;
const SHORT_S = 90;
const DAY_MINUTES = 60 * 24;
const SCOPE = 'openid profile email organizations notifications:read';
const ADMIN_ROLES = ['ROLE_USER', 'ROLE_ADMIN'];
const USER_ROLES = ['ROLE_USER'];
const MANAGERS = ['owner', 'admin'];

export const ISSUER = 'https://auth.example.com';
export const CLIENT_ID = 'hyperweaver';
export const ROLE_NAMES = ['ROLE_USER', 'ROLE_ADMIN'];
export const FIXTURE_PERSON = 42;
export const PROVIDER_PEOPLE = { startcloud: 42, github: 2, google: 1, microsoft: 4 };

const PEOPLE_ROWS = [
  [42, 'mark', 'Mark', 'Gilbert', 'super-admin'],
  [1, 'user', 'Sam', 'Rivera', 'user'],
  [2, 'admin', 'Dana', 'Whitfield', 'admin'],
  [3, 'super', 'Priya', 'Natarajan', 'super-admin'],
  [4, 'guest', 'Guest', 'Download', 'user'],
  [5, 'jlee', 'Jordan', 'Lee', 'user'],
  [6, 'mchen', 'Mei', 'Chen', 'admin'],
  [7, 'nokafor', 'Ngozi', 'Okafor', 'user'],
  [8, 'tbaker', 'Tom', 'Baker', 'user'],
  [9, 'asilva', 'Ana', 'Silva', 'user'],
  [10, 'rpatel', 'Ravi', 'Patel', 'user'],
  [11, 'hschmidt', 'Hanna', 'Schmidt', 'user'],
  [12, 'build-robot', 'Build', 'Robot', 'user'],
  [13, 'lnovak', 'Lena', 'Novak', 'user'],
];
const PEOPLE_EXTRAS = {
  42: {
    email: 'mark@m4kr.net',
    mobile_number: '+15555550142',
    address: {
      line1: '100 Example Street',
      city: 'Springfield',
      state: 'IL',
      postal_code: '62701',
      country: 'US',
      formatted: '100 Example Street, Springfield, IL 62701, US',
    },
  },
  2: { avatar_url: '/brand/startcloud/mark.svg' },
  7: { suspended: true },
  10: { verified: false },
  11: { suspended: true },
};
const ORGANIZATION_ROWS = [
  ['acme', 'Acme', 'A1B2C3', 'request'],
  ['prominic', 'Prominic', '0F00D5', 'request'],
  ['hart-consulting', 'Hart Consulting', 'C0FFEE', 'invite'],
  ['nomad-field-team', 'Nomad Field Team', 'BEEF01', 'private'],
  ['startcloud-labs', 'STARTcloud Labs', 'DEC0DE', 'invite'],
  ['old-projects', 'Old Projects', 'DEAD00', 'private'],
];
const ORGANIZATION_EXTRAS = {
  acme: { description: 'Builds and runs the machines of the Acme estate.' },
  prominic: {
    description: 'Hosting and datacenter operations.',
    logo: '/brand/prominic/mark.svg',
  },
  'hart-consulting': {
    description: 'Shares images with its customers through one download login.',
    default_role: 'guest',
  },
  'nomad-field-team': {
    description: 'Field engineers, their laptops and their lab machines.',
    logo: '/brand/nomadservices/mark.svg',
  },
  'startcloud-labs': {
    description: 'Managed at the identity provider, read-only here.',
    logo: '/brand/startcloud/mark.svg',
    external_issuer: ISSUER,
    external_org_id: ORG_UUIDS['startcloud-labs'],
  },
  'old-projects': { description: 'Suspended, kept for its records.', suspended: true },
};
const MEMBERSHIPS = [
  ['acme', 42, 'owner', true],
  ['acme', 1, 'member', true],
  ['acme', 2, 'admin', true],
  ['acme', 3, 'owner', false],
  ['acme', 5, 'member', true],
  ['acme', 6, 'admin', false],
  ['acme', 7, 'member', true],
  ['acme', 8, 'guest', false],
  ['prominic', 42, 'admin', false],
  ['prominic', 2, 'member', false],
  ['prominic', 9, 'owner', true],
  ['prominic', 10, 'member', true],
  ['prominic', 11, 'member', true],
  ['hart-consulting', 4, 'guest', true],
  ['hart-consulting', 42, 'guest', false],
  ['hart-consulting', 13, 'owner', true],
  ['hart-consulting', 8, 'member', true],
  ['nomad-field-team', 42, 'member', false],
  ['nomad-field-team', 3, 'admin', false],
  ['nomad-field-team', 5, 'owner', false],
  ['nomad-field-team', 12, 'member', true],
  ['startcloud-labs', 3, 'owner', true],
  ['startcloud-labs', 6, 'member', true],
  ['old-projects', 9, 'owner', false],
];

export const hashOf = text => {
  const clean = String(text).trim().toLowerCase();
  return createHash('sha256').update(clean).digest('hex');
};

const personOf = ([id, username, given, family, role]) => {
  const extras = PEOPLE_EXTRAS[id] || {};
  const email = extras.email || `${username}@example.com`;
  return {
    id,
    uuid: randomUUID(),
    username,
    name: `${given} ${family}`,
    given_name: given,
    family_name: family,
    middle_name: '',
    email,
    email_hash: hashOf(email),
    avatar_url: '',
    role,
    roles: role === 'user' ? USER_ROLES : ADMIN_ROLES,
    suspended: false,
    verified: true,
    mobile_number: '',
    address: null,
    preferred_mode: null,
    preferred_theme: null,
    preferred_motion: null,
    preferred_language: null,
    created_at: ago(DAY_MINUTES * (30 + id)),
    ...extras,
  };
};

/**
 * One organization's record in the members `GET /api/organization/{name}`
 * answers, its name a slug as the validation contract's law has it.
 *
 * @param {Object} options - `name`, `display`, `code`, `mode` and the members that differ
 * @returns {Object} The record
 */
export const organizationOf = ({ name, display, code, mode, more = {} }) => {
  const email = `hello@${name}.example.com`;
  const logo = more.logo || '';
  return {
    uuid: ORG_UUIDS[name] || randomUUID(),
    name,
    display_name: display,
    description: '',
    org_code: code,
    email,
    email_hash: hashOf(email),
    url: `https://${name}.example.com`,
    website_url: `https://${name}.example.com`,
    telephone: '+15555550100',
    locale: 'en-US',
    timezone: 'America/Chicago',
    address: null,
    access_mode: mode,
    default_role: 'member',
    personal: false,
    suspended: false,
    external_issuer: null,
    external_org_id: null,
    invite_code: code.toLowerCase(),
    created_at: now(),
    ...more,
    logo,
    logo_url: logo,
  };
};

const seededOrganization = ([name, display, code, mode], index) => ({
  ...organizationOf({ name, display, code, mode, more: ORGANIZATION_EXTRAS[name] }),
  id: index + 1,
  created_at: ago(DAY_MINUTES * (90 + index)),
});

export const people = new Map(PEOPLE_ROWS.map(row => [row[0], personOf(row)]));

export const organizations = new Map(
  ORGANIZATION_ROWS.map((row, index) => [row[0], seededOrganization(row, index)])
);

export const memberships = MEMBERSHIPS.map(([org, user, role, primary], index) => ({
  org,
  user,
  role,
  primary,
  joined_at: ago(DAY_MINUTES * (20 + index)),
}));

export const personById = id => people.get(Number(id)) || null;

export const personByName = username =>
  [...people.values()].find(row => row.username === username) || null;

/**
 * The person a sign-in name stands for: `user`, `admin`, `super` and
 * `guest` are four people of their own, a user, an admin, a super-admin
 * and a guest-only account, and any other name is the fixture's person
 * under the name typed, a super-admin with every right.
 *
 * @param {string} username - The name typed at sign-in
 * @returns {Object} The person
 */
export const personFor = username => {
  const known = personByName(username);
  if (known) {
    return known;
  }
  const fixturePerson = people.get(FIXTURE_PERSON);
  fixturePerson.username = username;
  return fixturePerson;
};

export const membershipsOf = row => memberships.filter(entry => entry.user === row.id);

export const membersOf = name => memberships.filter(entry => entry.org === name);

export const membershipIn = (row, name) =>
  memberships.find(entry => entry.user === row.id && entry.org === name) || null;

export const isAdmin = row => row.roles.includes('ROLE_ADMIN');

export const manages = (row, name) =>
  isAdmin(row) || MANAGERS.includes(membershipIn(row, name)?.role);

export const orgUuidsOf = row =>
  membershipsOf(row).map(entry => organizations.get(entry.org)?.uuid || '');

export const join = ({ org, user, role, primary = false }) => {
  memberships.push({ org, user, role, primary, joined_at: now() });
};

export const leave = (org, user) => {
  const index = memberships.findIndex(entry => entry.org === org && entry.user === user);
  if (index >= 0) {
    memberships.splice(index, 1);
  }
};

export const forget = user => {
  const kept = memberships.filter(entry => entry.user !== user);
  memberships.splice(0, memberships.length, ...kept);
};

export const forgetOrganization = name => {
  const kept = memberships.filter(entry => entry.org !== name);
  memberships.splice(0, memberships.length, ...kept);
};

export const renameMemberships = (from, to) => {
  memberships.forEach(entry => {
    if (entry.org === from) {
      entry.org = to;
    }
  });
};

const membershipRow = entry => {
  const org = organizations.get(entry.org);
  return {
    id: org.id,
    name: org.name,
    display_name: org.display_name,
    description: org.description,
    role: entry.role,
    is_primary: entry.primary,
    personal: org.personal,
    logo: org.logo,
    email_hash: org.email_hash,
    joined_at: entry.joined_at,
    organization: { id: org.id, name: org.name, description: org.description, logo: org.logo },
  };
};

export const membershipRows = row =>
  membershipsOf(row)
    .filter(entry => organizations.has(entry.org))
    .map(membershipRow);

const claimedMembership = row => ({
  uuid: organizations.get(row.name).uuid,
  name: row.name,
  display_name: row.display_name,
  roles: [row.role.toUpperCase()],
  primary: row.is_primary,
  personal: row.personal,
  logo_url: row.logo || null,
  email_hash: row.email_hash,
});

const mobileOf = row => {
  const value = row.mobile_number;
  return value ? { value, verified: false } : null;
};

/**
 * One person's record as `GET /api/user` and the sign-in answer it: the
 * backend's own snake_case members, `role` the hyperweaver role the hosts
 * feature reads, `roles` the global roles the admin pages read, the
 * memberships in the identity provider's shape, `{ uuid, name,
 * display_name, roles, primary, personal, logo_url, email_hash }`, the
 * name the route slug and the display name beside it, the uuid the one a
 * host's and a machine's `org_uuids` name, and the preferences that ride
 * the record.
 *
 * @param {Object} row - The person
 * @param {string} provider - `local`, or `oidc-` and the provider's name
 * @returns {Object} The record
 */
export const recordOf = (row, provider) => {
  const rows = membershipRows(row);
  return {
    id: row.id,
    uuid: row.uuid,
    username: row.username,
    name: row.name,
    given_name: row.given_name,
    family_name: row.family_name,
    middle_name: row.middle_name,
    email: row.email,
    email_hash: row.email_hash,
    avatar_url: row.avatar_url,
    role: row.role,
    roles: row.roles,
    provider,
    has_local_auth: provider === 'local',
    verified: row.verified,
    suspended: row.suspended,
    scope: SCOPE,
    organization: rows.find(entry => entry.is_primary)?.name || rows[0]?.name || '',
    organizations: rows.map(claimedMembership),
    mobile_number: mobileOf(row),
    address: row.address,
    preferred_mode: row.preferred_mode,
    preferred_theme: row.preferred_theme,
    preferred_motion: row.preferred_motion,
    preferred_language: row.preferred_language,
    created_at: row.created_at,
  };
};

const claimedAddress = address => ({
  street_address: address.line1,
  locality: address.city,
  region: address.state,
  postal_code: address.postal_code,
  country: address.country,
  formatted: address.formatted,
});

const claimedPhone = row =>
  row.mobile_number ? { phone_number: row.mobile_number, phone_number_verified: false } : {};

/**
 * One person's claims as `GET /api/userinfo/claims` answers them, the
 * standard claims of OpenID Connect with the `notifications:read` scope
 * and the customer code of the primary organization.
 *
 * @param {Object} row - The person
 * @returns {Object} The claims
 */
export const claimsOf = row => {
  const primary = membershipsOf(row).find(entry => entry.primary);
  return {
    sub: row.uuid,
    name: row.name,
    given_name: row.given_name,
    family_name: row.family_name,
    middle_name: row.middle_name,
    preferred_username: row.username,
    email: row.email,
    email_verified: row.verified,
    picture: row.avatar_url,
    scope: SCOPE,
    customer_id: organizations.get(primary?.org)?.org_code || '',
    zoneinfo: 'America/Chicago',
    locale: row.preferred_language || 'en',
    ...claimedPhone(row),
    ...(row.address ? { address: claimedAddress(row.address) } : {}),
  };
};

const lifeOf = password => {
  if (password === 'expired') {
    return -HOUR_S;
  }
  return password === 'short' ? SHORT_S : HOUR_S;
};

const idTokenOf = (row, exp) =>
  unsignedJwt({
    iss: ISSUER,
    aud: CLIENT_ID,
    sub: row.uuid,
    email: row.email,
    name: row.name,
    iat: exp - HOUR_S,
    exp,
  });

/**
 * A session's token, an unsigned JWT the UI can read its `exp`,
 * `provider` and, for an identity provider's session, its `id_token`
 * from; the password `short` makes one that lives 90 seconds and the
 * password `expired` one that already ended.
 *
 * @param {Object} options - `person`, `provider` and optionally `password`
 * @returns {string} The token
 */
export const tokenFor = ({ person, provider = 'local', password = '' }) => {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + lifeOf(password);
  return unsignedJwt({
    id: person.id,
    username: person.username,
    role: person.role,
    provider,
    ...(provider === 'local' ? {} : { id_token: idTokenOf(person, exp) }),
    iat,
    exp,
  });
};

const apiKeys = new Map();

const FAR_FUTURE_S = 4102444800;

/**
 * Register an agent API key a page may sign in with: a request carrying
 * it as `Authorization: Bearer`, `X-API-Key` or the `__Host-hwa_session`
 * cookie on the `hyperweaver-agent` role, and as `x-access-token` on the
 * server role, is the fixture's
 * person, a super-admin, under the key's name, the key's own role kept
 * beside it for the agent's refusals.
 *
 * @param {string} key - The key
 * @param {string} name - The key's name
 * @param {string} [role] - The key's role, `admin`, `operator` or `viewer`
 * @returns {void}
 */
export const registerApiKey = (key, name, role = 'admin') => {
  apiKeys.set(key, { name, role });
};

export const forgetApiKey = key => {
  apiKeys.delete(key);
};

const apiKeyPayload = token =>
  apiKeys.has(token)
    ? {
        id: FIXTURE_PERSON,
        username: apiKeys.get(token).name,
        role: 'super-admin',
        key_role: apiKeys.get(token).role,
        provider: 'apikey',
        exp: FAR_FUTURE_S,
      }
    : null;

const SESSION_COOKIE = '__Host-hwa_session';
const COOKIE_RULES = 'HttpOnly; Secure; SameSite=Strict; Path=/';
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const OWN_SITES = ['same-origin', 'none'];

const bearerOf = req => {
  const header = String(req.headers.authorization || '');
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
};

const cookieEntry = entry => {
  const split = entry.indexOf('=');
  return [entry.slice(0, split), decodeURIComponent(entry.slice(split + 1))];
};

const cookiesOf = req =>
  Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map(entry => entry.trim())
      .filter(entry => entry.includes('='))
      .map(cookieEntry)
  );

const headerKeyOf = req => bearerOf(req) || String(req.headers['x-api-key'] || '');

const cookieKeyOf = req => {
  const key = cookiesOf(req)[SESSION_COOKIE] || '';
  return apiKeys.has(key) ? key : '';
};

/**
 * The credential a request carries: on the `hyperweaver-agent` role the
 * key of `Authorization: Bearer` or of `X-API-Key`, else the live key of
 * the `__Host-hwa_session` cookie, on every other role the token of
 * `x-access-token`; empty when the request carries none.
 *
 * @param {Object} req - The request
 * @returns {string} The credential
 */
export const credentialOf = req =>
  APIKEY_MODE ? headerKeyOf(req) || cookieKeyOf(req) : String(req.headers['x-access-token'] || '');

/**
 * The `Set-Cookie` header the agent's sign-ins answer: the key as the one
 * `__Host-hwa_session` cookie, `HttpOnly`, `Secure`, `SameSite=Strict`
 * and `Path=/`.
 *
 * @param {string} key - The key the session stands for
 * @returns {Object} The headers
 */
export const sessionCookies = key => ({
  'Set-Cookie': `${SESSION_COOKIE}=${key}; ${COOKIE_RULES}`,
});

/**
 * The `Set-Cookie` header that clears the agent's session cookie.
 *
 * @returns {Object} The headers
 */
export const clearedCookies = () => ({
  'Set-Cookie': `${SESSION_COOKIE}=; Max-Age=0; ${COOKIE_RULES}`,
});

/**
 * The headers a `401` of the agent answers: the cleared cookie while the
 * request carried a session cookie, nothing otherwise.
 *
 * @param {Object} req - The request
 * @returns {Object} The headers
 */
export const refusedCookies = req =>
  APIKEY_MODE && cookiesOf(req)[SESSION_COOKIE] ? clearedCookies() : {};

const hostOf = value => String(value || '').toLowerCase();

const originHostOf = req => {
  try {
    return hostOf(new URL(String(req.headers.origin)).host);
  } catch {
    return '';
  }
};

/**
 * Whether a request rides the agent's session cookie, with no header
 * credential, on a method but GET, HEAD and OPTIONS from another site: a
 * `Sec-Fetch-Site` present and neither `same-origin` nor `none`, and an
 * `Origin` whose host differs from the request's `Host`.
 *
 * @param {Object} req - The request
 * @returns {boolean} True for a request the agent refuses `403`
 */
export const forgedRequest = req => {
  if (!APIKEY_MODE || headerKeyOf(req) || !cookieKeyOf(req) || SAFE_METHODS.includes(req.method)) {
    return false;
  }
  const site = String(req.headers['sec-fetch-site'] || '');
  if (!site || OWN_SITES.includes(site)) {
    return false;
  }
  return originHostOf(req) !== hostOf(req.headers.host);
};

export const readToken = req => {
  const token = credentialOf(req);
  const payload = payloadOf(token) || apiKeyPayload(token);
  const row = payload ? personById(payload.id) : null;
  return row && !row.suspended ? { person: row, payload } : null;
};

/**
 * The session behind a request: the person its `x-access-token` names and
 * the token's payload, or null when the header is missing, the token is
 * unreadable or ended, or the person is gone or suspended.
 *
 * @param {Object} req - The request
 * @returns {{ person: Object, payload: Object }|null} The session
 */
export const sessionOf = req => {
  const held = readToken(req);
  const live = held && Number(held.payload.exp) * 1000 > Date.now();
  return live ? held : null;
};
