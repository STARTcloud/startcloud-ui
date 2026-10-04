import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requests = [];
const answers = new Map();

const answerFor = ({ method, url, headers }) => {
  const key = `${method} ${new URL(url).pathname}`;
  const answer = answers.get(key) || { status: 404, data: { msg: 'Not Found' } };
  const resolved = typeof answer === 'function' ? answer(headers) : answer;
  if (resolved.status >= 400) {
    const error = new Error(`request failed ${resolved.status}`);
    error.response = { status: resolved.status, data: resolved.data, headers: {} };
    error.isAxiosError = true;
    return Promise.reject(error);
  }
  return Promise.resolve({ status: 200, data: resolved.data, headers: {} });
};

vi.mock('axios', () => ({
  create: () => ({
    request: config => {
      requests.push(config);
      return answerFor(config);
    },
  }),
  isCancel: () => false,
  CanceledError: class CanceledError extends Error {},
}));

const PROFILE = {
  id: 12,
  name: 'Mark',
  role: 'admin',
  auth_provider: 'oidc',
  email: 'person@example.com',
  customer_id: '123456',
};

const BOUND_PROFILE = {
  ...PROFILE,
  issuer: 'https://auth.example.com',
  subject: '8f2c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11',
};

const RECORD = {
  id: 12,
  username: 'Mark',
  name: 'Mark',
  email: 'person@example.com',
  auth_provider: 'oidc',
  customer_id: '123456',
  issuer: 'https://auth.example.com',
  subject: '8f2c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11',
  role: 'admin',
  organizations: [],
};

const ACCOUNT = {
  ...RECORD,
  preferred_language: null,
  preferred_mode: null,
  preferred_theme: null,
  preferred_motion: null,
  preferred_timezone: null,
};

const storage = new Map();

const channels = [];

class FakeChannel {
  constructor(name) {
    this.name = name;
    this.posted = [];
    this.onmessage = null;
    channels.push(this);
  }

  postMessage(message) {
    this.posted.push(message);
  }

  close() {
    this.closed = true;
  }
}

const listeners = {};

const location = { hash: '', pathname: '/', search: '', assign: vi.fn(), reload: vi.fn() };

const history = { replaceState: vi.fn() };

const installGlobals = () => {
  vi.stubGlobal('localStorage', {
    getItem: key => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
  });
  vi.stubGlobal('window', {
    location,
    history,
    addEventListener: (name, handler) => {
      listeners[name] = handler;
    },
  });
  vi.stubGlobal('BroadcastChannel', FakeChannel);
};

const events = { emit: vi.fn(() => Promise.resolve([])), endSession: vi.fn() };

const okInfo = headers =>
  headers.Authorization === 'Bearer hw_good' || headers.Authorization === 'Bearer hw_new'
    ? { status: 200, data: PROFILE }
    : { status: 403, data: { msg: 'Invalid API key' } };

const okBoundInfo = headers =>
  headers.Authorization === 'Bearer hw_good'
    ? { status: 200, data: BOUND_PROFILE }
    : { status: 403, data: { msg: 'Invalid API key' } };

const okUser = headers =>
  headers.Authorization === 'Bearer hw_good'
    ? { status: 200, data: ACCOUNT }
    : { status: 403, data: { msg: 'Invalid API key' } };

const freshProvider = async () => {
  vi.resetModules();
  const { createApiKeySession } = await import('../../src/lib/apiKeySession.js');
  return createApiKeySession({ baseUrl: 'https://agent.test', events });
};

const stored = () => JSON.parse(storage.get('apikey') || 'null');

const sent = (method, path) =>
  requests.filter(call => call.method === method && new URL(call.url).pathname === path);

beforeEach(() => {
  installGlobals();
  storage.clear();
  requests.length = 0;
  answers.clear();
  channels.length = 0;
  location.hash = '';
  location.pathname = '/';
  location.search = '';
  location.assign.mockClear();
  location.reload.mockClear();
  history.replaceState.mockClear();
  events.emit.mockClear();
  events.endSession.mockClear();
  answers.set('GET /api/api-keys/info', okInfo);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('userOfKeyProfile', () => {
  it("maps the key's role onto the hosts feature's ladder and names the admin global", async () => {
    const { userOfKeyProfile } = await import('../../src/lib/apiKeySession.js');
    expect(userOfKeyProfile(PROFILE)).toEqual({
      id: 12,
      username: 'Mark',
      name: 'Mark',
      email: 'person@example.com',
      auth_provider: 'oidc',
      customer_id: '123456',
      issuer: null,
      subject: null,
      role: 'super-admin',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
    });
    expect(userOfKeyProfile({ id: 1, name: 'ci', role: 'operator' })).toMatchObject({
      role: 'admin',
      roles: ['ROLE_USER'],
      email: null,
      auth_provider: null,
      customer_id: null,
      issuer: null,
      subject: null,
    });
    expect(userOfKeyProfile({ id: 2, name: 'ro', role: 'viewer' }).role).toBe('user');
  });

  it('carries the issuer and the subject of a key a federated login minted', async () => {
    const { userOfKeyProfile } = await import('../../src/lib/apiKeySession.js');
    expect(userOfKeyProfile(BOUND_PROFILE)).toMatchObject({
      issuer: 'https://auth.example.com',
      subject: '8f2c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11',
    });
  });
});

describe('userOfAccount', () => {
  it("lays the key's profile over the agent's record without its preferred_* members, the key's role map deciding the role", async () => {
    const { userOfAccount } = await import('../../src/lib/apiKeySession.js');
    const user = userOfAccount(BOUND_PROFILE, ACCOUNT);
    expect(user).toEqual({
      ...RECORD,
      role: 'super-admin',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
    });
    expect('preferred_mode' in user).toBe(false);
    expect(userOfAccount(PROFILE, null)).toEqual({
      ...PROFILE,
      username: 'Mark',
      issuer: null,
      subject: null,
      role: 'super-admin',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
    });
  });
});

describe('trayTokenOf', () => {
  it('reads the tray token of the fragment and nothing else', async () => {
    const { trayTokenOf } = await import('../../src/lib/apiKeySession.js');
    expect(trayTokenOf('#tray=abc-123_X')).toBe('abc-123_X');
    expect(trayTokenOf('#other=1&tray=t0')).toBe('t0');
    expect(trayTokenOf('#tray=')).toBe('');
    expect(trayTokenOf('')).toBe('');
    expect(trayTokenOf(undefined)).toBe('');
  });
});

describe('createApiKeySession', () => {
  it('answers apikey, no refresh, no claims, no preferences and the Bearer header of the stored key', async () => {
    const session = await freshProvider();
    expect(session.id).toBe('apikey');
    expect(session.storageKey).toBe('apikey');
    expect(await session.retryAuth()).toBe(false);
    expect(await session.claims()).toBeNull();
    expect(await session.savePreferences({ mode: 'dark' })).toBeUndefined();
    expect(session.adoptResponse({ 'x-refreshed-token': 'x' })).toBeUndefined();
    expect(await session.headers()).toEqual({});
    storage.set('apikey', JSON.stringify({ key: 'hw_good', profile: PROFILE }));
    expect(await session.headers()).toEqual({ Authorization: 'Bearer hw_good' });
  });

  it('restores null while no key is stored and the record while one is', async () => {
    const session = await freshProvider();
    expect(session.restore()).toBeNull();
    storage.set('apikey', JSON.stringify({ key: 'hw_good', profile: PROFILE }));
    expect(session.restore()).toEqual({
      user: expect.objectContaining({ id: 12, username: 'Mark', role: 'super-admin' }),
      organizations: [],
      oidc: false,
      issuerUrl: '',
      clientId: '',
    });
  });

  it('loads the profile with the stored key, a 403 there clearing the record and a 500 keeping it', async () => {
    storage.set('apikey', JSON.stringify({ key: 'hw_good', profile: { id: 12, name: 'old' } }));
    const session = await freshProvider();
    const loaded = await session.load();
    expect(loaded.user.name).toBe('Mark');
    expect(sent('GET', '/api/api-keys/info')[0].headers.Authorization).toBe('Bearer hw_good');
    expect(stored().profile).toEqual(PROFILE);

    answers.set('GET /api/api-keys/info', { status: 500, data: {} });
    expect((await session.reload()).user.name).toBe('Mark');
    expect(stored().key).toBe('hw_good');

    answers.set('GET /api/api-keys/info', { status: 403, data: { msg: 'Invalid API key' } });
    expect(await session.refresh()).toBeNull();
    expect(stored()).toBeNull();
    expect(events.endSession).not.toHaveBeenCalled();
  });

  it('answers null from load while no key is stored and reads nothing', async () => {
    const session = await freshProvider();
    expect(await session.load()).toBeNull();
    expect(requests).toHaveLength(0);
  });

  it("reads GET /api/user with the same bearer once the key is proved, the user that record under the key's role, the issuer the session's", async () => {
    storage.set('apikey', JSON.stringify({ key: 'hw_good', profile: PROFILE }));
    answers.set('GET /api/api-keys/info', okBoundInfo);
    answers.set('GET /api/user', okUser);
    const session = await freshProvider();
    expect(session.restore().issuerUrl).toBe('');
    const loaded = await session.load();
    expect(sent('GET', '/api/user')[0].headers.Authorization).toBe('Bearer hw_good');
    expect(loaded.user).toEqual({
      ...RECORD,
      role: 'super-admin',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
    });
    expect(loaded.issuerUrl).toBe('https://auth.example.com');
    expect(loaded.organizations).toEqual([]);
    expect(stored()).toEqual({ key: 'hw_good', profile: BOUND_PROFILE });
    expect('preferred_mode' in session.restore().user).toBe(false);
    expect(session.restore().issuerUrl).toBe('https://auth.example.com');
  });

  it("keeps the key's profile as the whole identity while GET /api/user answers 404", async () => {
    storage.set('apikey', JSON.stringify({ key: 'hw_good', profile: PROFILE }));
    const session = await freshProvider();
    const loaded = await session.load();
    expect(sent('GET', '/api/user')).toHaveLength(1);
    expect(loaded.user).toEqual({
      ...PROFILE,
      username: 'Mark',
      issuer: null,
      subject: null,
      role: 'super-admin',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
    });
    expect(loaded.user.preferred_mode).toBeUndefined();
    expect(loaded.issuerUrl).toBe('');
  });

  it('keeps the record last held while GET /api/user fails otherwise, and forgets it with the key', async () => {
    storage.set('apikey', JSON.stringify({ key: 'hw_good', profile: PROFILE }));
    answers.set('GET /api/user', okUser);
    const session = await freshProvider();
    expect((await session.load()).user.organizations).toEqual([]);
    answers.set('GET /api/user', { status: 500, data: {} });
    expect((await session.reload()).user.organizations).toEqual([]);
    answers.set('GET /api/user', { status: 404, data: { msg: 'Not Found' } });
    expect((await session.reload()).user.organizations).toBeUndefined();
    answers.set('GET /api/user', okUser);
    expect((await session.reload()).user.organizations).toEqual([]);
    session.signOut();
    expect(session.restore()).toBeNull();
    storage.set('apikey', JSON.stringify({ key: 'hw_good', profile: PROFILE }));
    expect(session.restore().user.organizations).toBeUndefined();
  });

  it('proves a pasted key with both reads and the next load answers the record without a read', async () => {
    answers.set('GET /api/user', okUser);
    const session = await freshProvider();
    const signedIn = await session.login('hw_good');
    expect(signedIn.user.organizations).toEqual([]);
    expect(sent('GET', '/api/user')).toHaveLength(1);
    expect((await session.load()).user.organizations).toEqual([]);
    expect(sent('GET', '/api/user')).toHaveLength(1);
    await session.load();
    expect(sent('GET', '/api/user')).toHaveLength(2);
  });

  it("writes the patch's timezone under the browser's timezone key, sends nothing and stores no preference", async () => {
    storage.set('apikey', JSON.stringify({ key: 'hw_good', profile: PROFILE }));
    answers.set('GET /api/user', okUser);
    const session = await freshProvider();
    const { ownTimezone } = await import('../../src/lib/apiKeySession.js');
    await session.load();
    await session.savePreferences({ mode: 'light', theme: 'lcars', language: 'en' });
    expect(sent('PATCH', '/api/user/preferences')).toHaveLength(0);
    expect(storage.has('timezone')).toBe(false);
    expect(ownTimezone()).toBe('');
    await session.savePreferences({ motion: 'reduce', timezone: 'Europe/Berlin' });
    expect(storage.get('timezone')).toBe('Europe/Berlin');
    expect(ownTimezone()).toBe('Europe/Berlin');
    await session.savePreferences({ timezone: null });
    expect(storage.has('timezone')).toBe(false);
    expect(requests.filter(call => call.method === 'PATCH')).toHaveLength(0);
    expect(stored()).toEqual({ key: 'hw_good', profile: PROFILE });
  });

  it('proves a pasted key with the profile read as its bearer, stores it, and the next load answers it once without a read', async () => {
    const session = await freshProvider();
    const signedIn = await session.login('  hw_good ');
    expect(signedIn.user.username).toBe('Mark');
    expect(sent('GET', '/api/api-keys/info')[0].headers.Authorization).toBe('Bearer hw_good');
    expect(stored()).toEqual({ key: 'hw_good', profile: PROFILE });
    expect(events.emit).toHaveBeenCalledWith('login');
    expect((await session.load()).user.username).toBe('Mark');
    expect(sent('GET', '/api/api-keys/info')).toHaveLength(1);
    await session.load();
    expect(sent('GET', '/api/api-keys/info')).toHaveLength(2);
  });

  it('refuses a dead pasted key and stores nothing', async () => {
    const session = await freshProvider();
    await expect(session.login('hw_dead')).rejects.toMatchObject({ status: 403 });
    expect(stored()).toBeNull();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('claims the tray token once per page load with the fragment stripped first and tells the other tabs', async () => {
    location.hash = '#tray=tok_1';
    answers.set('POST /api/auth/tray-claim', { status: 200, data: { api_key: 'hw_new' } });
    const session = await freshProvider();
    const claimed = await session.complete();
    expect(claimed.user.username).toBe('Mark');
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/');
    const [claim] = sent('POST', '/api/auth/tray-claim');
    expect(claim.data).toEqual({ token: 'tok_1' });
    expect(sent('GET', '/api/api-keys/info')[0].headers.Authorization).toBe('Bearer hw_new');
    expect(stored().key).toBe('hw_new');
    expect(channels[0].posted).toEqual([
      expect.objectContaining({ type: 'auth-updated', key: 'apikey' }),
    ]);
    expect(await session.complete()).toBeNull();
    expect((await session.load()).user.username).toBe('Mark');
    expect(sent('POST', '/api/auth/tray-claim')).toHaveLength(1);
    expect(sent('GET', '/api/api-keys/info')).toHaveLength(1);
    await session.load();
    expect(sent('GET', '/api/api-keys/info')).toHaveLength(2);
  });

  it('answers the claim to load and to complete each once, and to complete never after a sign-out', async () => {
    location.hash = '#tray=tok_4';
    answers.set('POST /api/auth/tray-claim', { status: 200, data: { api_key: 'hw_new' } });
    const session = await freshProvider();
    expect((await session.load()).user.username).toBe('Mark');
    expect((await session.complete()).user.username).toBe('Mark');
    expect(await session.complete()).toBeNull();
    session.signOut();
    expect(await session.complete()).toBeNull();
    expect(sent('POST', '/api/auth/tray-claim')).toHaveLength(1);
  });

  it('forgets the claim on sign-out before complete asked for it', async () => {
    location.hash = '#tray=tok_5';
    answers.set('POST /api/auth/tray-claim', { status: 200, data: { api_key: 'hw_new' } });
    const session = await freshProvider();
    expect((await session.load()).user.username).toBe('Mark');
    session.signOut();
    expect(await session.complete()).toBeNull();
    expect(stored()).toBeNull();
  });

  it('ends the session on the bus once, and not at all while no record is stored', async () => {
    const session = await freshProvider();
    session.endSession();
    expect(events.endSession).not.toHaveBeenCalled();
    storage.set('apikey', JSON.stringify({ key: 'hw_good', profile: PROFILE }));
    session.endSession();
    session.endSession();
    expect(events.endSession).toHaveBeenCalledTimes(1);
    expect(stored()).toBeNull();
  });

  it('stores the members the session reads and writes the same record on every read', async () => {
    let reads = 0;
    answers.set('GET /api/api-keys/info', () => {
      reads += 1;
      return {
        status: 200,
        data: {
          ...PROFILE,
          description: 'Created by the tray',
          created_at: '2026-09-27T21:44:00-05:00',
          last_used: `2026-09-27T21:58:${String(reads).padStart(2, '0')}-05:00`,
        },
      };
    });
    const session = await freshProvider();
    await session.login('hw_good');
    const first = storage.get('apikey');
    expect(JSON.parse(first).profile).toEqual(PROFILE);
    await session.load();
    await session.reload();
    expect(storage.get('apikey')).toBe(first);
    expect(reads).toBe(2);
  });

  it('lets a stored key that still validates outrank the claim, the fragment stripped unclaimed', async () => {
    location.hash = '#tray=tok_2';
    storage.set('apikey', JSON.stringify({ key: 'hw_good', profile: PROFILE }));
    const session = await freshProvider();
    const kept = await session.load();
    expect(kept.user.username).toBe('Mark');
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/');
    expect(sent('POST', '/api/auth/tray-claim')).toHaveLength(0);
    expect(stored().key).toBe('hw_good');
    expect(channels[0].posted).toHaveLength(1);
  });

  it('claims when the stored key is dead, and answers null when the claim is refused', async () => {
    location.hash = '#tray=tok_3';
    storage.set('apikey', JSON.stringify({ key: 'hw_dead', profile: PROFILE }));
    answers.set('POST /api/auth/tray-claim', { status: 403, data: { msg: 'Invalid or expired' } });
    const session = await freshProvider();
    expect(await session.load()).toBeNull();
    expect(sent('POST', '/api/auth/tray-claim')).toHaveLength(1);
    expect(stored()).toBeNull();
  });

  it('answers null from complete while the fragment carries no token', async () => {
    const session = await freshProvider();
    expect(await session.complete()).toBeNull();
    expect(requests).toHaveLength(0);
  });

  it('begins the silent path by asking the authorize URL and navigating there, the device path by answering the grant, and Sign in by moving to /login', async () => {
    answers.set('POST /api/auth/oidc/silent-start', {
      status: 200,
      data: { authorize_url: 'https://idp.test/authorize?prompt=none' },
    });
    answers.set('POST /api/auth/oidc/device-start', {
      status: 200,
      data: { handle: 'h1', user_code: 'ABCD-EFGH' },
    });
    const session = await freshProvider();
    await session.begin({ method: 'silent' });
    expect(location.assign).toHaveBeenCalledWith('https://idp.test/authorize?prompt=none');
    expect(await session.begin({ method: 'device' })).toEqual({
      handle: 'h1',
      user_code: 'ABCD-EFGH',
    });
    const navigate = vi.fn();
    await session.begin({ navigate });
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('forgets the record on sign-out, on sign-out everywhere and on endSession, which ends the session on the bus', async () => {
    storage.set('apikey', JSON.stringify({ key: 'hw_good', profile: PROFILE }));
    const session = await freshProvider();
    session.signOut();
    expect(stored()).toBeNull();
    storage.set('apikey', JSON.stringify({ key: 'hw_good', profile: PROFILE }));
    await session.signOutEverywhere();
    expect(stored()).toBeNull();
    expect(location.assign).toHaveBeenCalledWith('/');
    storage.set('apikey', JSON.stringify({ key: 'hw_good', profile: PROFILE }));
    session.endSession();
    expect(stored()).toBeNull();
    expect(events.endSession).toHaveBeenCalledTimes(1);
    expect(requests).toHaveLength(0);
  });

  it('reloads a tab that hears auth-updated while signed out or holding another key, and never its own echo', async () => {
    const session = await freshProvider();
    const [channel] = channels;
    channel.onmessage({ data: { type: 'auth-updated', key: 'apikey', senderId: 'other' } });
    expect(location.reload).not.toHaveBeenCalled();
    storage.set('apikey', JSON.stringify({ key: 'hw_good', profile: PROFILE }));
    channel.onmessage({ data: { type: 'auth-updated', key: 'apikey', senderId: 'other' } });
    expect(location.reload).toHaveBeenCalledTimes(1);
    await session.load();
    channel.onmessage({ data: { type: 'auth-updated', key: 'apikey', senderId: 'other' } });
    expect(location.reload).toHaveBeenCalledTimes(1);
    storage.set('apikey', JSON.stringify({ key: 'hw_new', profile: PROFILE }));
    listeners.storage({ key: 'apikey', newValue: 'x' });
    expect(location.reload).toHaveBeenCalledTimes(2);
    listeners.storage({ key: 'apikey', newValue: null });
    expect(location.reload).toHaveBeenCalledTimes(2);
  });

  it('stores the key and the profile alone, never a preferred_* member, so the pre-paint script reads the browser keys', async () => {
    storage.set('apikey', JSON.stringify({ key: 'hw_good', profile: PROFILE }));
    answers.set('GET /api/user', okUser);
    const session = await freshProvider();
    await session.load();
    expect(stored()).toEqual({ key: 'hw_good', profile: PROFILE });
    const fresh = await freshProvider();
    expect('preferred_mode' in fresh.restore().user).toBe(false);
    answers.set('GET /api/user', { status: 404, data: { msg: 'Not Found' } });
    await fresh.load();
    expect(stored()).toEqual({ key: 'hw_good', profile: PROFILE });
    expect('preferred_mode' in fresh.restore().user).toBe(false);
  });
});
