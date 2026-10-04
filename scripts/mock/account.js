import { createHash, randomBytes } from 'crypto';

import { notify } from './inbox.js';
import { integrationsOf } from './integrations.js';
import {
  ago,
  ahead,
  denied,
  empty,
  failure,
  invalid,
  missing,
  now,
  ok,
  redirect,
  taken,
  unauthenticated,
} from './kit.js';
import {
  CLIENT_ID,
  ISSUER,
  PROVIDER_PEOPLE,
  claimsOf,
  forget,
  hashOf,
  isAdmin,
  membershipsOf,
  organizations,
  people,
  personById,
  personByName,
  personFor,
  readToken,
  recordOf,
  tokenFor,
} from './people.js';
import { refusedBy } from './rules.js';
import { closeStreamsOf, publish } from './stream.js';

const STEP_UP_MS = 5 * 60 * 1000;
const DAY_MINUTES = 60 * 24;
const PREFERENCES = {
  mode: 'preferred_mode',
  theme: 'preferred_theme',
  motion: 'preferred_motion',
  language: 'preferred_language',
};
const PROFILE_MEMBERS = ['given_name', 'family_name', 'middle_name', 'mobile_number', 'address'];
const METHODS = [
  { id: 'local', name: 'Password', enabled: true },
  {
    id: 'oidc-startcloud',
    name: 'STARTcloud',
    enabled: true,
    icon_url: '/brand/startcloud/mark.svg',
  },
  { id: 'oidc-github', name: 'GitHub', enabled: true, icon_url: '/brand/providers/github.svg' },
  { id: 'oidc-google', name: 'Google', enabled: true, icon_url: '/brand/providers/google.svg' },
  {
    id: 'oidc-microsoft',
    name: 'Microsoft',
    enabled: true,
    icon_url: '/brand/providers/microsoft.svg',
  },
  { id: 'oidc-okta', name: 'Okta', enabled: false },
];
const APPS = [
  ['conductor', 'Conductor', 'https://conductor.example.com'],
  ['boxvault', 'BoxVault', 'https://boxvault.example.com'],
  ['provisioner-catalog', 'Provisioner Catalog', 'https://catalog.example.com'],
  ['vdi-health', 'VDI Health Monitor', 'https://vdi.example.com'],
  ['zoneweaver', 'Zoneweaver', 'https://zoneweaver.example.com'],
  [CLIENT_ID, 'Hyperweaver', 'https://hyperweaver.example.com'],
];
const FAVORITE_LABELS = { 'vdi-health': 'Desktops' };
const BLOCKED_PASSWORD = 'correct horse battery staple';
const STARTING_FAVORITES = 4;

const codes = new Map();
const favorites = new Map();
const accounts = new Map();
const steppedUp = new Map();
const mailTokens = new Map();

const appOf = ([id, name, home]) => ({
  client_id: id,
  client_name: name,
  icon_url: `${home}/favicon.ico`,
  home_url: home,
});

const appNamed = id => {
  const known = APPS.find(([name]) => name === id);
  return known ? appOf(known) : { client_id: id, client_name: id, icon_url: '', home_url: '' };
};

const startingFavorites = () =>
  APPS.slice(0, STARTING_FAVORITES).map(([id], index) => ({
    ...appNamed(id),
    custom_label: FAVORITE_LABELS[id] || null,
    order: index,
  }));

/**
 * A person's favorites, the starting four until a save replaces them; the
 * one store the backend session's routes and the agent's relay answer.
 *
 * @param {Object} person - The person
 * @returns {Array<Object>} The ordered favorites
 */
export const favoritesOf = person => {
  if (!favorites.has(person.id)) {
    favorites.set(person.id, startingFavorites());
  }
  return favorites.get(person.id);
};

/**
 * The whole ordered list saved, each entry enriched from the app's own
 * registration, answered as stored.
 *
 * @param {Object} ctx - The request's context, its `body` the list
 * @returns {Object} The answer
 */
export const savedFavorites = ctx => {
  const rows = Array.isArray(ctx.body) ? ctx.body : [];
  const saved = rows.map((row, index) => ({
    ...appNamed(String(row.client_id)),
    custom_label: row.custom_label || null,
    order: Number.isFinite(row.order) ? row.order : index,
  }));
  favorites.set(ctx.person.id, saved);
  return ok(saved);
};

const profileUpdated = person =>
  publish({ topic: 'profile', event: 'profile-updated', data: {}, to: person.id });

const signedIn = (person, body) => {
  const stay = Boolean(body.stay_logged_in);
  return ok({
    ...recordOf(person, 'local'),
    stay_logged_in: stay,
    access_token: tokenFor({ person, password: String(body.password) }),
  });
};

const signIn = ctx => {
  const { username, password } = ctx.body;
  if (!username || !password || password === 'wrong') {
    return unauthenticated('The name or the password is wrong.');
  }
  const person = personFor(String(username));
  return person.suspended ? denied('The account is suspended.') : signedIn(person, ctx.body);
};

const nextId = () => Math.max(...people.keys()) + 1;

const registered = body => {
  const email = String(body.email);
  const [given = '', ...rest] = String(body.name || body.username).split(' ');
  const person = {
    ...people.get(1),
    id: nextId(),
    uuid: randomBytes(16).toString('hex'),
    username: String(body.username),
    name: String(body.name || body.username),
    given_name: given,
    family_name: rest.join(' '),
    email,
    email_hash: hashOf(email),
    verified: false,
    created_at: now(),
  };
  people.set(person.id, person);
  mailTokens.set(`verify-${person.id}`, person.id);
  return person;
};

const signUp = ctx => {
  const { body } = ctx;
  const refused = refusedBy('register', body, ['username', 'email', 'password']);
  if (refused) {
    return refused;
  }
  if (personByName(String(body.username))) {
    return taken('/username', 'global');
  }
  const person = registered(body);
  notify(person, {
    title: 'Verify your email address',
    body: `Open /api/auth/verify-mail/verify-${person.id} to verify ${person.email}.`,
    type: 'ACCOUNT',
    severity: 'WARNING',
    navigate: '/profile',
  });
  return ok({ message: `The account ${person.username} is created. Sign in to continue.` }, 201);
};

const verifiedMail = ctx => {
  const person = personById(mailTokens.get(ctx.params.token));
  if (!person) {
    return missing('The link is not known or was used already.');
  }
  mailTokens.delete(ctx.params.token);
  person.verified = true;
  profileUpdated(person);
  return ok({ message: 'The email address is verified.' });
};

const resent = ctx => {
  mailTokens.set(`verify-${ctx.person.id}`, ctx.person.id);
  return ok({ message: `A verification link was sent to ${ctx.person.email}.` });
};

const begun = ctx => {
  const name = ctx.params.provider.replace('oidc-', '');
  const person = personById(PROVIDER_PEOPLE[name]);
  if (!person) {
    return redirect('/login?error=no_provider');
  }
  const code = randomBytes(16).toString('hex');
  codes.set(code, { person: person.id, provider: `oidc-${name}` });
  return redirect(`/auth/callback?code=${code}`);
};

const exchanged = ctx => {
  const held = codes.get(String(ctx.body.code || ''));
  const person = held ? personById(held.person) : null;
  if (!person) {
    return unauthenticated('The code is not known or was used already.');
  }
  codes.delete(ctx.body.code);
  return ok({ token: tokenFor({ person, provider: held.provider }) });
};

const refreshed = ctx => {
  const held = readToken(ctx.req);
  if (!held) {
    return unauthenticated('The session cannot be refreshed.');
  }
  return ok({
    access_token: tokenFor({ person: held.person, provider: held.payload.provider }),
    stay_logged_in: Boolean(ctx.body.stay_logged_in),
  });
};

const signedOut = ctx => {
  ctx.res.once('finish', () => closeStreamsOf(ctx.person.id));
  return ok({ redirect_url: '/login' });
};

const etagOf = record => {
  const digest = createHash('sha1').update(JSON.stringify(record)).digest('hex');
  return `"${digest}"`;
};

const ownRecord = ctx => {
  const rows = integrationsOf(ctx.person);
  const record = {
    ...recordOf(ctx.person, ctx.token.provider),
    ...(rows ? { integrations: rows } : {}),
  };
  const etag = etagOf(record);
  if (ctx.req.headers['if-none-match'] === etag) {
    return empty(304, { ETag: etag });
  }
  return ok(record, 200, { ETag: etag });
};

const readOnlyMembers = body =>
  invalid(Object.keys(body).map(member => failure({ pointer: `/${member}`, rule: 'readOnly' })));

const patched = ctx => {
  const { person, body, token } = ctx;
  if (token.provider !== 'local') {
    return readOnlyMembers(body);
  }
  const refused = refusedBy('profile', body);
  if (refused) {
    return refused;
  }
  PROFILE_MEMBERS.filter(member => member in body).forEach(member => {
    person[member] = body[member] ?? (member === 'address' ? null : '');
  });
  person.name = `${person.given_name} ${person.family_name}`.trim() || person.name;
  profileUpdated(person);
  return ok(recordOf(person, token.provider));
};

const preferred = ctx => {
  const { person, body } = ctx;
  Object.keys(PREFERENCES)
    .filter(member => member in body)
    .forEach(member => {
      person[PREFERENCES[member]] = body[member] ?? null;
    });
  profileUpdated(person);
  return ok(recordOf(person, ctx.token.provider));
};

const allowed = ctx => String(ctx.person.id) === ctx.params.id || isAdmin(ctx.person);

const changing = (formKey, member, change) => ctx => {
  const person = personById(ctx.params.id);
  if (!person || !allowed(ctx)) {
    return denied('Only the account itself or an administrator may change it.');
  }
  const refused = refusedBy(formKey, ctx.body, [member]);
  if (refused) {
    return refused;
  }
  const answer = change({ person, value: ctx.body[member] });
  profileUpdated(person);
  return answer;
};

const renamed = changing('displayName', 'name', ({ person, value }) => {
  person.name = String(value || '');
  return ok({ message: 'The name is changed.' });
});

const repassworded = changing('password', 'password', ({ value }) => {
  if (value === BLOCKED_PASSWORD) {
    return invalid([failure({ pointer: '/password', rule: 'blocklist' })]);
  }
  return ok({ message: 'The password is changed.' });
});

const remailed = changing('email', 'new_email', ({ person, value }) => {
  const holder = [...people.values()].find(row => row.email === value);
  if (holder && holder !== person) {
    return taken('/new_email', 'global');
  }
  person.email = String(value);
  person.email_hash = hashOf(person.email);
  person.verified = false;
  mailTokens.set(`verify-${person.id}`, person.id);
  return ok({ message: `A verification link was sent to ${person.email}.` });
});

const deleted = ctx => {
  const person = personById(ctx.params.id);
  if (!person || !allowed(ctx)) {
    return denied('Only the account itself or an administrator may delete it.');
  }
  people.delete(person.id);
  forget(person.id);
  publish({ topic: 'session', event: 'session-terminated', data: {}, to: person.id });
  return ok({ message: `The account ${person.username} is deleted.`, next: '/login' });
};

const stepUp = ctx => {
  const { password, code } = ctx.body;
  if (password === 'wrong' || code === '000000' || (!password && !code)) {
    return denied('That did not confirm it is you.', { code: 'step_up_failed' });
  }
  steppedUp.set(ctx.person.id, Date.now() + STEP_UP_MS);
  return empty(204);
};

/**
 * Whether a person confirmed it is them inside the last five minutes,
 * the window a route that steps up asks for.
 *
 * @param {Object} person - The person
 * @returns {boolean} True while the window is open
 */
export const hasSteppedUp = person => Number(steppedUp.get(person.id)) > Date.now();

const startingAccounts = person => [
  {
    id: person.id * 100 + 1,
    username: `${person.username}-ci`,
    description: 'Starts and stops the build machines',
    role: 'member',
    expires_at: ahead(DAY_MINUTES * 60),
    last_used_at: ago(42),
    created_at: ago(DAY_MINUTES * 30),
  },
  {
    id: person.id * 100 + 2,
    username: `${person.username}-backup`,
    description: 'Took the nightly snapshots, expired',
    role: 'guest',
    expires_at: ago(DAY_MINUTES * 3),
    last_used_at: ago(DAY_MINUTES * 4),
    created_at: ago(DAY_MINUTES * 93),
  },
];

const ownedBy = (row, org) => ({
  ...row,
  organization_id: org.id,
  organization: { id: org.id, name: org.name, logo: org.logo },
});

const accountsOf = person => {
  if (!accounts.has(person.id)) {
    const [first] = membershipsOf(person);
    const org = organizations.get(first?.org);
    const rows = org ? startingAccounts(person) : [];
    const owned = rows.map(row => ownedBy(row, org));
    accounts.set(person.id, owned);
  }
  return accounts.get(person.id);
};

const accountOrganizations = ctx => {
  const writable = membershipsOf(ctx.person).filter(entry => entry.role !== 'guest');
  const known = writable.filter(entry => organizations.has(entry.org));
  return ok(known.map(entry => ({ id: organizations.get(entry.org).id, name: entry.org })));
};

const createdAccount = ctx => {
  const { person, body } = ctx;
  const refused = refusedBy('serviceAccount', body, ['organization_id']);
  if (refused) {
    return refused;
  }
  const org = [...organizations.values()].find(row => row.id === Number(body.organization_id));
  if (!org) {
    return missing('No such organization.');
  }
  const days = Number(body.expiration_days) || 30;
  const created = {
    id: Date.now(),
    username: `${person.username}-${randomBytes(3).toString('hex')}`,
    description: String(body.description || ''),
    role: body.role || 'member',
    expires_at: ahead(DAY_MINUTES * days),
    last_used_at: null,
    created_at: now(),
  };
  const row = ownedBy(created, org);
  accounts.set(person.id, [row, ...accountsOf(person)]);
  return ok({ ...row, token: `hw_${randomBytes(24).toString('hex')}` }, 201);
};

const removedAccount = ctx => {
  const rows = accountsOf(ctx.person);
  const kept = rows.filter(row => String(row.id) !== ctx.params.id);
  accounts.set(ctx.person.id, kept);
  return kept.length < rows.length ? ok({ message: 'Removed.' }) : missing('No such account.');
};

/**
 * The backend session's routes: the sign-in methods, the password
 * sign-in, the registration, the provider redirect that lands on
 * `/auth/callback` with a one-time code and its exchange, the refresh,
 * the sign-out everywhere, the record with its `ETag`, the profile's
 * writes, the preferences, the favorites, the claims, the step-up and
 * the service accounts.
 *
 * @param {Object} router - `publicRoute` and `sessionRoute`
 * @returns {void}
 */
export const mountAccount = ({ publicRoute, sessionRoute }) => {
  publicRoute('GET', '/api/auth/methods', () =>
    ok({
      methods: METHODS,
      default_provider: 'startcloud',
      silent_login: false,
      local_registration_enabled: true,
    })
  );
  publicRoute('POST', '/api/auth/signin', signIn);
  publicRoute('POST', '/api/auth/signup', signUp);
  publicRoute('POST', '/api/auth/refresh-token', refreshed);
  publicRoute('GET', '/api/auth/verify-mail/:token', verifiedMail);
  publicRoute('GET', '/api/auth/oidc/issuers', () =>
    ok({ issuers: [{ provider: 'startcloud', issuer: ISSUER }] })
  );
  publicRoute('POST', '/api/auth/oidc/exchange', exchanged);
  publicRoute('GET', '/api/auth/oidc/:provider', begun);
  sessionRoute('POST', '/api/auth/oidc/logout', signedOut);
  sessionRoute('POST', '/api/auth/resend-verification', resent);
  sessionRoute('GET', '/api/user', ownRecord);
  sessionRoute('PATCH', '/api/user', patched);
  sessionRoute('PATCH', '/api/user/preferences', preferred);
  sessionRoute('GET', '/api/user/favorites', ctx => ok(favoritesOf(ctx.person)));
  sessionRoute('PUT', '/api/user/favorites', savedFavorites);
  sessionRoute('GET', '/api/userinfo/claims', ctx => ok(claimsOf(ctx.person)));
  sessionRoute('POST', '/api/user/step-up', stepUp);
  sessionRoute('PUT', '/api/users/:id/change-name', renamed);
  sessionRoute('PUT', '/api/users/:id/change-password', repassworded);
  sessionRoute('PUT', '/api/users/:id/change-email', remailed);
  sessionRoute('DELETE', '/api/users/:id', deleted);
  sessionRoute('GET', '/api/service-accounts/', ctx => ok(accountsOf(ctx.person)));
  sessionRoute('GET', '/api/service-accounts/organizations', accountOrganizations);
  sessionRoute('POST', '/api/service-accounts/', createdAccount);
  sessionRoute('DELETE', '/api/service-accounts/:id', removedAccount);
};
