import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requests = [];
const answers = new Map();
const agent = { key: '' };

const answerFor = config => {
  const key = `${config.method} ${new URL(config.url).pathname}`;
  const answer = answers.get(key) || { status: 404, data: { msg: 'Not Found' } };
  const resolved = typeof answer === 'function' ? answer(config) : answer;
  if (resolved.status >= 400) {
    const error = new Error(`request failed ${resolved.status}`);
    error.response = { status: resolved.status, data: resolved.data, headers: {} };
    error.isAxiosError = true;
    return Promise.reject(error);
  }
  return Promise.resolve({ status: resolved.status, data: resolved.data, headers: {} });
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

const LIVE_KEYS = ['hw_good', 'hw_new'];

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

const close = vi.fn();

const installGlobals = () => {
  vi.stubGlobal('localStorage', {
    getItem: key => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
  });
  vi.stubGlobal('window', {
    location,
    history,
    close,
    addEventListener: (name, handler) => {
      listeners[name] = handler;
    },
  });
  vi.stubGlobal('BroadcastChannel', FakeChannel);
};

const events = { emit: vi.fn(() => Promise.resolve([])), endSession: vi.fn() };

const live = () => LIVE_KEYS.includes(agent.key);

const unauthorized = { status: 401, data: { msg: 'API key required' } };

const okInfo = () => (live() ? { status: 200, data: PROFILE } : unauthorized);

const okBoundInfo = () =>
  agent.key === 'hw_good' ? { status: 200, data: BOUND_PROFILE } : unauthorized;

const okUser = () => (agent.key === 'hw_good' ? { status: 200, data: ACCOUNT } : unauthorized);

const openSession = config => {
  if (!LIVE_KEYS.includes(config.data.api_key)) {
    return { status: 401, data: { msg: 'Invalid API key' } };
  }
  agent.key = config.data.api_key;
  return { status: 204, data: '' };
};

const claimTray = () => {
  agent.key = 'hw_new';
  return { status: 204, data: '' };
};

const closeSession = () => {
  agent.key = '';
  return { status: 204, data: '' };
};

const freshProvider = async () => {
  vi.resetModules();
  const { createApiKeySession } = await import('../../src/lib/apiKeySession.js');
  return createApiKeySession({ baseUrl: 'https://agent.test', events });
};

const hold = (record, key = 'hw_good') => {
  storage.set('apikey', JSON.stringify(record));
  agent.key = key;
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
  agent.key = '';
  location.hash = '';
  location.pathname = '/';
  location.search = '';
  location.assign.mockClear();
  location.reload.mockClear();
  close.mockClear();
  history.replaceState.mockClear();
  events.emit.mockClear();
  events.endSession.mockClear();
  answers.set('GET /api/api-keys/info', okInfo);
  answers.set('POST /api/auth/session', openSession);
  answers.set('POST /api/auth/logout', closeSession);
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
  it('answers apikey, no refresh, no claims, no preferences and no header of its own on any method, the cookie riding the browser alone', async () => {
    const session = await freshProvider();
    expect(session.id).toBe('apikey');
    expect(session.storageKey).toBe('apikey');
    expect(session.authHeader).toBeUndefined();
    expect(await session.retryAuth()).toBe(false);
    expect(await session.claims()).toBeNull();
    expect(await session.savePreferences({ mode: 'dark' })).toBeUndefined();
    expect(session.adoptResponse({ 'x-refreshed-token': 'x' })).toBeUndefined();
    hold(PROFILE);
    const methods = ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'];
    const answered = await Promise.all(
      methods.map(method => session.headers(method, 'https://agent.test/api/x'))
    );
    expect(answered).toEqual(methods.map(() => ({})));
  });

  it('restores null while no profile is cached and the session while one is', async () => {
    const session = await freshProvider();
    expect(session.restore()).toBeNull();
    hold(PROFILE);
    expect(session.restore()).toEqual({
      user: expect.objectContaining({ id: 12, username: 'Mark', role: 'super-admin' }),
      organizations: [],
      oidc: false,
      issuerUrl: '',
      clientId: '',
    });
  });

  it('loads the profile on the session cookie with no credential header, a 401 there clearing the record and a 500 keeping it', async () => {
    hold({ id: 12, name: 'old' });
    const session = await freshProvider();
    const loaded = await session.load();
    expect(loaded.user.name).toBe('Mark');
    expect(sent('GET', '/api/api-keys/info')[0].headers.Authorization).toBeUndefined();
    expect(stored()).toEqual(PROFILE);

    answers.set('GET /api/api-keys/info', { status: 500, data: {} });
    expect((await session.reload()).user.name).toBe('Mark');
    expect(stored()).toEqual(PROFILE);

    answers.set('GET /api/api-keys/info', { status: 403, data: { msg: 'Forbidden' } });
    expect((await session.reload()).user.name).toBe('Mark');
    expect(stored()).toEqual(PROFILE);

    agent.key = '';
    answers.set('GET /api/api-keys/info', okInfo);
    expect(await session.refresh()).toBeNull();
    expect(stored()).toBeNull();
    expect(events.endSession).not.toHaveBeenCalled();
  });

  it('answers null from load while no profile is cached and reads nothing', async () => {
    const session = await freshProvider();
    expect(await session.load()).toBeNull();
    expect(requests).toHaveLength(0);
  });

  it("reads GET /api/user on the same session once the profile is read, the user that record under the key's role, the issuer the session's", async () => {
    hold(PROFILE);
    answers.set('GET /api/api-keys/info', okBoundInfo);
    answers.set('GET /api/user', okUser);
    const session = await freshProvider();
    expect(session.restore().issuerUrl).toBe('');
    const loaded = await session.load();
    expect(sent('GET', '/api/user')[0].headers.Authorization).toBeUndefined();
    expect(loaded.user).toEqual({
      ...RECORD,
      role: 'super-admin',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
    });
    expect(loaded.issuerUrl).toBe('https://auth.example.com');
    expect(loaded.organizations).toEqual([]);
    expect(stored()).toEqual(BOUND_PROFILE);
    expect('preferred_mode' in session.restore().user).toBe(false);
    expect(session.restore().issuerUrl).toBe('https://auth.example.com');
  });

  it("keeps the key's profile as the whole identity while GET /api/user answers 404", async () => {
    hold(PROFILE);
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

  it('keeps the record last held while GET /api/user fails otherwise, and forgets it on sign-out', async () => {
    hold(PROFILE);
    answers.set('GET /api/user', okUser);
    const session = await freshProvider();
    expect((await session.load()).user.organizations).toEqual([]);
    answers.set('GET /api/user', { status: 500, data: {} });
    expect((await session.reload()).user.organizations).toEqual([]);
    answers.set('GET /api/user', { status: 404, data: { msg: 'Not Found' } });
    expect((await session.reload()).user.organizations).toBeUndefined();
    answers.set('GET /api/user', okUser);
    expect((await session.reload()).user.organizations).toEqual([]);
    await session.signOut();
    expect(session.restore()).toBeNull();
    hold(PROFILE);
    expect(session.restore().user.organizations).toBeUndefined();
  });

  it('hands a pasted key to POST /api/auth/session, reads both profiles, never caches the key, and the next load answers the record without a read', async () => {
    answers.set('GET /api/user', okUser);
    const session = await freshProvider();
    const signedIn = await session.login('  hw_good ');
    const [opened] = sent('POST', '/api/auth/session');
    expect(opened.data).toEqual({ api_key: 'hw_good' });
    expect(opened.headers['X-XSRF-TOKEN']).toBeUndefined();
    expect(requests.every(call => call.headers['X-XSRF-TOKEN'] === undefined)).toBe(true);
    expect(signedIn.user.username).toBe('Mark');
    expect(signedIn.user.organizations).toEqual([]);
    expect(stored()).toEqual(PROFILE);
    expect(storage.get('apikey')).not.toContain('hw_good');
    expect(events.emit).toHaveBeenCalledWith('login');
    expect(sent('GET', '/api/user')).toHaveLength(1);
    expect((await session.load()).user.organizations).toEqual([]);
    expect(sent('GET', '/api/api-keys/info')).toHaveLength(1);
    expect(sent('GET', '/api/user')).toHaveLength(1);
    await session.load();
    expect(sent('GET', '/api/api-keys/info')).toHaveLength(2);
    expect(sent('GET', '/api/user')).toHaveLength(2);
  });

  it("writes the patch's timezone under the browser's timezone key, sends nothing and caches no preference", async () => {
    hold(PROFILE);
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
    expect(stored()).toEqual(PROFILE);
  });

  it('refuses a pasted key the agent answers 401, reads no profile and caches nothing', async () => {
    const session = await freshProvider();
    await expect(session.login('hw_dead')).rejects.toMatchObject({ status: 401 });
    expect(sent('GET', '/api/api-keys/info')).toHaveLength(0);
    expect(stored()).toBeNull();
    expect(events.emit).not.toHaveBeenCalled();
    expect(events.endSession).not.toHaveBeenCalled();
  });

  it('adopts the session the cookies already carry with the profile read, posting no key, and the next load answers it once without a read', async () => {
    agent.key = 'hw_good';
    const session = await freshProvider();
    const adopted = await session.adopt();
    expect(adopted.user.username).toBe('Mark');
    expect(sent('POST', '/api/auth/session')).toHaveLength(0);
    expect(stored()).toEqual(PROFILE);
    expect(events.emit).toHaveBeenCalledWith('login');
    expect((await session.load()).user.username).toBe('Mark');
    expect(sent('GET', '/api/api-keys/info')).toHaveLength(1);
  });

  it('refuses to adopt while the agent answers 401 and caches nothing', async () => {
    const session = await freshProvider();
    await expect(session.adopt()).rejects.toMatchObject({ status: 401 });
    expect(stored()).toBeNull();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('claims the tray token once per page load with the fragment stripped first, reads the profile on the cookies it set, asks the other tabs and tells them', async () => {
    location.hash = '#tray=tok_1';
    answers.set('POST /api/auth/tray-claim', claimTray);
    const session = await freshProvider();
    const claimed = await session.complete();
    expect(claimed.user.username).toBe('Mark');
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/');
    const [claim] = sent('POST', '/api/auth/tray-claim');
    expect(claim.data).toEqual({ token: 'tok_1' });
    expect(stored()).toEqual(PROFILE);
    expect(channels[0].posted).toEqual([
      expect.objectContaining({ type: 'auth-ping', key: 'apikey' }),
      expect.objectContaining({ type: 'auth-updated', key: 'apikey' }),
    ]);
    expect(close).not.toHaveBeenCalled();
    expect(await session.complete()).toBeNull();
    expect((await session.load()).user.username).toBe('Mark');
    expect(sent('POST', '/api/auth/tray-claim')).toHaveLength(1);
    expect(sent('GET', '/api/api-keys/info')).toHaveLength(1);
    await session.load();
    expect(sent('GET', '/api/api-keys/info')).toHaveLength(2);
  });

  it('answers the claim to load and to complete each once, and to complete never after a sign-out', async () => {
    location.hash = '#tray=tok_4';
    answers.set('POST /api/auth/tray-claim', claimTray);
    const session = await freshProvider();
    expect((await session.load()).user.username).toBe('Mark');
    expect((await session.complete()).user.username).toBe('Mark');
    expect(await session.complete()).toBeNull();
    await session.signOut();
    expect(await session.complete()).toBeNull();
    expect(sent('POST', '/api/auth/tray-claim')).toHaveLength(1);
  });

  it('forgets the claim on sign-out before complete asked for it', async () => {
    location.hash = '#tray=tok_5';
    answers.set('POST /api/auth/tray-claim', claimTray);
    const session = await freshProvider();
    expect((await session.load()).user.username).toBe('Mark');
    await session.signOut();
    expect(await session.complete()).toBeNull();
    expect(stored()).toBeNull();
  });

  it('ends the session on the bus once, and not at all while no record is cached', async () => {
    const session = await freshProvider();
    session.endSession();
    expect(events.endSession).not.toHaveBeenCalled();
    hold(PROFILE);
    session.endSession();
    session.endSession();
    expect(events.endSession).toHaveBeenCalledTimes(1);
    expect(stored()).toBeNull();
  });

  it('caches the members the session reads and writes the same record on every read', async () => {
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
    expect(JSON.parse(first)).toEqual(PROFILE);
    await session.load();
    await session.reload();
    expect(storage.get('apikey')).toBe(first);
    expect(reads).toBe(2);
  });

  it('lets a cached session that still validates outrank the claim, the fragment stripped unclaimed', async () => {
    location.hash = '#tray=tok_2';
    hold(PROFILE);
    const session = await freshProvider();
    const kept = await session.load();
    expect(kept.user.username).toBe('Mark');
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/');
    expect(sent('POST', '/api/auth/tray-claim')).toHaveLength(0);
    expect(stored()).toEqual(PROFILE);
    expect(channels[0].posted.map(message => message.type)).toEqual(['auth-ping', 'auth-updated']);
  });

  it('closes the hand-off tab the moment another tab answers the ping, and never a tab that handed nothing off', async () => {
    location.hash = '#tray=tok_6';
    answers.set('POST /api/auth/tray-claim', claimTray);
    const session = await freshProvider();
    const [channel] = channels;
    channel.onmessage({ data: { type: 'auth-pong', key: 'apikey', senderId: 'other' } });
    expect(close).not.toHaveBeenCalled();
    await session.load();
    const own = channel.posted[0].senderId;
    channel.onmessage({ data: { type: 'auth-pong', key: 'apikey', senderId: own } });
    expect(close).not.toHaveBeenCalled();
    channel.onmessage({ data: { type: 'auth-pong', key: 'other-key', senderId: 'other' } });
    expect(close).not.toHaveBeenCalled();
    channel.onmessage({ data: { type: 'auth-pong', key: 'apikey', senderId: 'other' } });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("answers another tab's ping with a pong and ignores its own", async () => {
    await freshProvider();
    const [channel] = channels;
    channel.onmessage({ data: { type: 'auth-ping', key: 'apikey', senderId: 'other' } });
    expect(channel.posted).toEqual([expect.objectContaining({ type: 'auth-pong', key: 'apikey' })]);
    const own = channel.posted[0].senderId;
    channel.onmessage({ data: { type: 'auth-ping', key: 'apikey', senderId: own } });
    expect(channel.posted).toHaveLength(1);
    expect(close).not.toHaveBeenCalled();
  });

  it('claims when the cached session is dead, and answers null when the claim is refused', async () => {
    location.hash = '#tray=tok_3';
    hold(PROFILE, 'hw_dead');
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

  it('begins the silent path by asking the authorize URL and navigating there, the code path by answering the flow, and Sign in by moving to /login', async () => {
    answers.set('POST /api/auth/oidc/silent-start', {
      status: 200,
      data: { authorize_url: 'https://idp.test/authorize?prompt=none' },
    });
    answers.set('POST /api/auth/oidc/code-start', {
      status: 200,
      data: {
        handle: 'h1',
        authorize_url: 'https://idp.test/authorize?state=s1',
        manual_url: 'https://idp.test/authorize?state=s1',
        expires_in: 300,
      },
    });
    const session = await freshProvider();
    await session.begin({ method: 'silent' });
    expect(location.assign).toHaveBeenCalledWith('https://idp.test/authorize?prompt=none');
    expect(await session.begin({ method: 'code' })).toEqual({
      handle: 'h1',
      authorize_url: 'https://idp.test/authorize?state=s1',
      manual_url: 'https://idp.test/authorize?state=s1',
      expires_in: 300,
    });
    expect(sent('POST', '/api/auth/oidc/device-start')).toHaveLength(0);
    const navigate = vi.fn();
    await session.begin({ navigate });
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('forgets the record and posts POST /api/auth/logout on the cookie alone on both sign-outs, and endSession ends the session on the bus asking nothing', async () => {
    hold(PROFILE);
    const session = await freshProvider();
    await session.signOut();
    expect(stored()).toBeNull();
    expect(agent.key).toBe('');
    const [logout] = sent('POST', '/api/auth/logout');
    expect(logout.url).toBe('https://agent.test/api/auth/logout');
    expect(logout.headers['X-XSRF-TOKEN']).toBeUndefined();
    expect(logout.headers.Authorization).toBeUndefined();
    expect(location.assign).not.toHaveBeenCalled();
    hold(PROFILE);
    await session.signOutEverywhere();
    expect(stored()).toBeNull();
    expect(sent('POST', '/api/auth/logout')).toHaveLength(2);
    expect(location.assign).toHaveBeenCalledWith('/');
    hold(PROFILE);
    session.endSession();
    expect(stored()).toBeNull();
    expect(events.endSession).toHaveBeenCalledTimes(1);
    expect(sent('POST', '/api/auth/logout')).toHaveLength(2);
  });

  it('signs out locally while the logout request fails', async () => {
    hold(PROFILE);
    answers.set('POST /api/auth/logout', { status: 500, data: {} });
    const session = await freshProvider();
    await session.signOut();
    expect(stored()).toBeNull();
    await session.signOutEverywhere();
    expect(location.assign).toHaveBeenCalledWith('/');
    expect(events.endSession).not.toHaveBeenCalled();
  });

  it("reloads a tab that hears auth-updated while signed out or holding another key's session, and never its own echo", async () => {
    const session = await freshProvider();
    const [channel] = channels;
    channel.onmessage({ data: { type: 'auth-updated', key: 'apikey', senderId: 'other' } });
    expect(location.reload).not.toHaveBeenCalled();
    hold(PROFILE);
    channel.onmessage({ data: { type: 'auth-updated', key: 'apikey', senderId: 'other' } });
    expect(location.reload).toHaveBeenCalledTimes(1);
    await session.load();
    channel.onmessage({ data: { type: 'auth-updated', key: 'apikey', senderId: 'other' } });
    expect(location.reload).toHaveBeenCalledTimes(1);
    storage.set('apikey', JSON.stringify({ ...PROFILE, id: 13 }));
    listeners.storage({ key: 'apikey', newValue: 'x' });
    expect(location.reload).toHaveBeenCalledTimes(2);
    listeners.storage({ key: 'apikey', newValue: null });
    expect(location.reload).toHaveBeenCalledTimes(2);
  });

  it('caches the profile alone, never the key and never a preferred_* member, so the pre-paint script reads the browser keys', async () => {
    hold(PROFILE);
    answers.set('GET /api/user', okUser);
    const session = await freshProvider();
    await session.load();
    expect(stored()).toEqual(PROFILE);
    const fresh = await freshProvider();
    expect('preferred_mode' in fresh.restore().user).toBe(false);
    answers.set('GET /api/user', { status: 404, data: { msg: 'Not Found' } });
    await fresh.load();
    expect(stored()).toEqual(PROFILE);
    expect('preferred_mode' in fresh.restore().user).toBe(false);
  });
});
