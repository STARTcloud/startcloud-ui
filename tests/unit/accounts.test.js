import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { namesAnotherPerson, othersRemain } from '../../src/hooks/useSessionKeepalive.js';
import { isPagePath } from '../../src/lib/next.js';

const answers = new Map();

const calls = [];

const answerFor = config => {
  const key = `${config.method.toUpperCase()} ${new URL(config.url).pathname}`;
  calls.push(key);
  const answer = answers.get(key) || { status: 404, data: { title: 'Not Found' } };
  if (answer.status >= 400) {
    const error = new Error(`request failed ${answer.status}`);
    error.response = { status: answer.status, data: answer.data, headers: {} };
    error.isAxiosError = true;
    return Promise.reject(error);
  }
  return Promise.resolve({ status: answer.status, data: answer.data, headers: {} });
};

vi.mock('axios', () => ({
  create: () => ({ request: config => answerFor(config) }),
  isCancel: () => false,
  CanceledError: class CanceledError extends Error {},
}));

vi.mock('../../src/contexts/StatusContext.jsx', () => ({ useStatus: () => ({}) }));

vi.mock('../../src/lib/runtime.js', () => ({
  connectEventStream: () => undefined,
  disconnectEventStream: () => undefined,
  eventHub: { subscribe: () => () => undefined },
  events: { emit: () => undefined },
  session: { storageKey: 'account' },
}));

const ADA = {
  id: 'pX3',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  picture: '/api/user/avatar/3f5a',
  active: true,
  signed_in: true,
};

const GRACE = {
  id: 'rQ9',
  name: null,
  email: 'grace@example.com',
  picture: null,
  active: false,
  signed_in: false,
};

const CACHED = {
  name: 'Mark Gilbert',
  email: 'mark@m4kr.net',
  picture: null,
  roles: ['ROLE_USER'],
  organizations: [],
  has_local_auth: true,
};

const createStorage = () => {
  const store = {};
  Object.defineProperties(store, {
    getItem: { value: key => (Object.hasOwn(store, key) ? store[key] : null) },
    setItem: {
      value: (key, value) => {
        store[key] = String(value);
      },
    },
    removeItem: {
      value: key => {
        delete store[key];
      },
    },
  });
  return store;
};

let storage = createStorage();

let tabStorage = createStorage();

const location = { pathname: '/select-account', search: '', assign: vi.fn() };

const events = { emit: vi.fn(() => Promise.resolve([])), endSession: vi.fn() };

const installGlobals = () => {
  storage = createStorage();
  tabStorage = createStorage();
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('sessionStorage', tabStorage);
  vi.stubGlobal('window', { location });
  vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=tok' });
};

const freshSession = async () => {
  vi.resetModules();
  const { createCookieSession } = await import('../../src/lib/cookieSession.js');
  const { createReturnTo } = await import('../../src/lib/returnTo.js');
  const returnTo = createReturnTo({
    storageKey: 'intended_url',
    signInPath: '/login',
    authPaths: ['/login', '/select-account'],
  });
  return createCookieSession({ baseUrl: 'https://auth.test', events, returnTo });
};

const cached = () => JSON.parse(storage.getItem('account') || 'null');

beforeEach(() => {
  installGlobals();
  answers.clear();
  calls.length = 0;
  location.assign.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the cookie session over the browser accounts', () => {
  it('reads the list', async () => {
    answers.set('GET /api/auth/accounts', {
      status: 200,
      data: { accounts: [ADA], pending: null },
    });
    const session = await freshSession();
    expect(await session.accounts()).toEqual({ accounts: [ADA], pending: null });
  });

  it('chooses an account: posts the choice, replaces the cached profile in place and leaves for next', async () => {
    storage.setItem('account', JSON.stringify(CACHED));
    storage.setItem('intended_url', '/user/profile');
    answers.set('POST /api/auth/accounts/rQ9/choose', {
      status: 200,
      data: { next: '/oauth2/authorize?client_id=mail&prompt=select_account' },
    });
    const session = await freshSession();
    await session.chooseAccount(GRACE);
    expect(calls).toEqual(['POST /api/auth/accounts/rQ9/choose']);
    expect(cached()).toMatchObject({ name: null, email: 'grace@example.com', picture: null });
    expect(storage.getItem('intended_url')).toBe('/user/profile');
    expect(location.assign).toHaveBeenCalledWith(
      '/oauth2/authorize?client_id=mail&prompt=select_account'
    );
  });

  it('leaves for the page that asked when next is home and home when nobody asked', async () => {
    answers.set('POST /api/auth/accounts/rQ9/choose', { status: 200, data: { next: '/' } });
    const session = await freshSession();
    await session.chooseAccount(GRACE, '/activate?user_code=ABCD-EFGH');
    expect(location.assign).toHaveBeenLastCalledWith('/activate?user_code=ABCD-EFGH');
    await session.chooseAccount(GRACE);
    expect(location.assign).toHaveBeenLastCalledWith('/');
  });

  it('refuses a next on another origin and lands home', async () => {
    answers.set('POST /api/auth/accounts/rQ9/choose', {
      status: 200,
      data: { next: 'https://evil.example/' },
    });
    const session = await freshSession();
    await session.chooseAccount(GRACE);
    expect(location.assign).toHaveBeenCalledWith('/');
  });

  it('adds an account: posts the add, marks the tab and leaves for next, the mark read once', async () => {
    storage.setItem('account', JSON.stringify(CACHED));
    answers.set('POST /api/auth/accounts/add', { status: 200, data: { next: '/login' } });
    const session = await freshSession();
    expect(session.addingAccount()).toBe(false);
    await session.addAccount();
    expect(calls).toEqual(['POST /api/auth/accounts/add']);
    expect(cached()).toEqual(CACHED);
    expect(tabStorage.getItem('adding_account')).toBe('1');
    expect(location.assign).toHaveBeenCalledWith('/login');
    expect(session.addingAccount()).toBe(true);
    expect(tabStorage.getItem('adding_account')).toBeNull();
    expect(session.addingAccount()).toBe(false);
  });

  it('signs out another account: a 204 answers false and moves nobody', async () => {
    storage.setItem('account', JSON.stringify(CACHED));
    answers.set('DELETE /api/auth/accounts/rQ9', { status: 204, data: '' });
    const session = await freshSession();
    expect(await session.signOutAccount(GRACE)).toBe(false);
    expect(cached()).toEqual(CACHED);
    expect(location.assign).not.toHaveBeenCalled();
  });

  it('signs out the active account: forgets the profile and the per-person keys and leaves for next', async () => {
    storage.setItem('account', JSON.stringify(CACHED));
    storage.setItem('intended_url', '/user/profile');
    storage.setItem('activeOrganization', 'uuid-1');
    storage.setItem('theme', 'startcloud');
    answers.set('DELETE /api/auth/accounts/pX3', {
      status: 200,
      data: { next: '/select-account' },
    });
    const session = await freshSession();
    expect(await session.signOutAccount(ADA)).toBe(true);
    expect(cached()).toBeNull();
    expect(storage.getItem('intended_url')).toBeNull();
    expect(storage.getItem('activeOrganization')).toBeNull();
    expect(storage.getItem('theme')).toBe('startcloud');
    expect(location.assign).toHaveBeenCalledWith('/select-account');
  });

  it('signs out another account answered 200: keeps the cached profile and leaves for next', async () => {
    storage.setItem('account', JSON.stringify(CACHED));
    answers.set('DELETE /api/auth/accounts/rQ9', {
      status: 200,
      data: { next: '/connect/logout/frontchannel' },
    });
    const session = await freshSession();
    expect(await session.signOutAccount(GRACE)).toBe(true);
    expect(cached()).toEqual(CACHED);
    expect(location.assign).toHaveBeenCalledWith('/connect/logout/frontchannel');
  });

  it('signs everyone out: forgets and leaves for next', async () => {
    storage.setItem('account', JSON.stringify(CACHED));
    answers.set('DELETE /api/auth/accounts', { status: 200, data: { next: '/login?logout' } });
    const session = await freshSession();
    await session.signOutAccounts();
    expect(calls).toEqual(['DELETE /api/auth/accounts']);
    expect(cached()).toBeNull();
    expect(location.assign).toHaveBeenCalledWith('/login?logout');
  });

  it('throws the 404 not_found of a stale id to the caller', async () => {
    answers.set('DELETE /api/auth/accounts/rQ9', {
      status: 404,
      data: { status: 404, code: 'not_found' },
    });
    const session = await freshSession();
    await expect(session.signOutAccount(GRACE)).rejects.toMatchObject({
      status: 404,
      code: 'not_found',
    });
    expect(location.assign).not.toHaveBeenCalled();
  });
});

describe('namesAnotherPerson', () => {
  it('answers true while both carry an email and they differ', () => {
    expect(namesAnotherPerson({ email: 'grace@example.com' }, { email: 'mark@m4kr.net' })).toBe(
      true
    );
  });

  it('answers false for the same person, a side without an email and nothing', () => {
    expect(namesAnotherPerson({ email: 'mark@m4kr.net' }, { email: 'mark@m4kr.net' })).toBe(false);
    expect(namesAnotherPerson({ name: 'Mark' }, { email: 'mark@m4kr.net' })).toBe(false);
    expect(namesAnotherPerson({ email: 'grace@example.com' }, null)).toBe(false);
    expect(namesAnotherPerson(null, { email: 'mark@m4kr.net' })).toBe(false);
  });
});

describe('othersRemain', () => {
  it('answers true while the browser still holds an account, signed in or remembered', () => {
    expect(othersRemain({ accounts: [GRACE], pending: null })).toBe(true);
    expect(othersRemain({ accounts: [ADA, GRACE], pending: null })).toBe(true);
  });

  it('answers false for the empty answer and for none', () => {
    expect(othersRemain({ accounts: [], pending: null })).toBe(false);
    expect(othersRemain(null)).toBe(false);
    expect(othersRemain(undefined)).toBe(false);
  });
});

describe('isPagePath', () => {
  it('counts the chooser among the pages', () => {
    expect(isPagePath('/select-account')).toBe(true);
  });
});
