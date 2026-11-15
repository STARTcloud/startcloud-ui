import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isNotPending, isPendingGate, onGatePage, pendingGateNext } from '../../src/lib/gates.js';

const answers = new Map();

const answerFor = config => {
  const key = `${config.method} ${new URL(config.url).pathname}`;
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

const SECOND_FACTOR = {
  type: 'https://auth.startcloud.com/probs/forbidden',
  status: 403,
  title: 'This action is not allowed.',
  detail: 'Complete the second factor first.',
  code: 'second_factor_required',
  next: '/authenticator',
};

const ONBOARDING = {
  type: 'https://auth.startcloud.com/probs/forbidden',
  status: 403,
  code: 'onboarding_required',
  next: '/complete-onboarding/choose-2fa-method',
};

const PENDING_PROFILE = {
  ...ONBOARDING,
  next: '/complete-onboarding',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  picture: null,
  roles: ['ROLE_USER'],
  organizations: [],
  has_local_auth: true,
};

const CACHED = {
  name: 'Mark Gilbert',
  email: 'mark@m4kr.net',
  picture: null,
  roles: ['ROLE_USER'],
  organizations: [],
  has_local_auth: true,
};

const AUTH_PATHS = ['/login', '/authenticator', '/complete-onboarding'];

const storage = new Map();

const location = { pathname: '/', search: '' };

const events = { emit: vi.fn(() => Promise.resolve([])), endSession: vi.fn() };

const installGlobals = () => {
  vi.stubGlobal('localStorage', {
    getItem: key => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
  });
  vi.stubGlobal('window', { location });
};

const freshSession = async () => {
  vi.resetModules();
  const { createCookieSession } = await import('../../src/lib/cookieSession.js');
  const { createReturnTo } = await import('../../src/lib/returnTo.js');
  const returnTo = createReturnTo({
    storageKey: 'intended_url',
    signInPath: '/login',
    authPaths: AUTH_PATHS,
  });
  const session = createCookieSession({ baseUrl: 'https://auth.test', events, returnTo });
  return { session, returnTo };
};

const cached = () => JSON.parse(storage.get('account') || 'null');

const refusal = body => ({ status: 403, code: body.code, data: body });

beforeEach(() => {
  installGlobals();
  storage.clear();
  answers.clear();
  location.pathname = '/';
  location.search = '';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isPendingGate', () => {
  it('answers true for a 403 whose code is onboarding_required, terms_required or second_factor_required', () => {
    expect(isPendingGate({ status: 403, code: 'onboarding_required' })).toBe(true);
    expect(isPendingGate({ status: 403, code: 'terms_required' })).toBe(true);
    expect(isPendingGate({ status: 403, code: 'second_factor_required' })).toBe(true);
  });

  it('answers false for another code, another status and no error', () => {
    expect(isPendingGate({ status: 403, code: 'step_up_required' })).toBe(false);
    expect(isPendingGate({ status: 401, code: 'second_factor_required' })).toBe(false);
    expect(isPendingGate({ status: 403 })).toBe(false);
    expect(isPendingGate(null)).toBe(false);
  });
});

describe('pendingGateNext', () => {
  it('answers the same-origin path the refusal names as next', () => {
    expect(pendingGateNext(refusal(SECOND_FACTOR))).toBe('/authenticator');
    expect(pendingGateNext(refusal(ONBOARDING))).toBe('/complete-onboarding/choose-2fa-method');
  });

  it('answers empty for another origin, a protocol-relative path and no next', () => {
    expect(pendingGateNext({ data: { next: 'https://evil.example/authenticator' } })).toBe('');
    expect(pendingGateNext({ data: { next: '//evil.example' } })).toBe('');
    expect(pendingGateNext({ data: { next: 7 } })).toBe('');
    expect(pendingGateNext({ data: null })).toBe('');
    expect(pendingGateNext(null)).toBe('');
  });
});

describe('onGatePage', () => {
  it("answers true on a page of the gate's own chain", () => {
    expect(onGatePage(refusal(SECOND_FACTOR), '/authenticator')).toBe(true);
    expect(onGatePage(refusal(SECOND_FACTOR), '/authenticator-method')).toBe(true);
    expect(onGatePage(refusal(ONBOARDING), '/complete-onboarding')).toBe(true);
    expect(onGatePage(refusal(ONBOARDING), '/complete-onboarding/backup-codes')).toBe(true);
    expect(onGatePage(refusal(ONBOARDING), '/qrcode')).toBe(true);
    expect(onGatePage({ code: 'terms_required' }, '/oauth2/accept-terms')).toBe(true);
  });

  it('answers false on a page of another chain, an app page and for another code', () => {
    expect(onGatePage(refusal(SECOND_FACTOR), '/complete-onboarding')).toBe(false);
    expect(onGatePage(refusal(ONBOARDING), '/authenticator')).toBe(false);
    expect(onGatePage({ code: 'terms_required' }, '/oauth2/consent')).toBe(false);
    expect(onGatePage(refusal(SECOND_FACTOR), '/login')).toBe(false);
    expect(onGatePage(refusal(SECOND_FACTOR), '/user/profile')).toBe(false);
    expect(onGatePage({ code: 'step_up_required' }, '/authenticator')).toBe(false);
    expect(onGatePage(null, '/authenticator')).toBe(false);
  });
});

describe('isNotPending', () => {
  it('answers true for a 403 not_pending alone', () => {
    expect(isNotPending({ status: 403, code: 'not_pending' })).toBe(true);
    expect(isNotPending({ status: 403, code: 'onboarding_required' })).toBe(false);
    expect(isNotPending({ status: 404, code: 'not_pending' })).toBe(false);
  });
});

describe('createCookieSession following a pending gate', () => {
  it('moves to next on a second_factor_required answered to load, remembers the page and leaves the cached profile as it is', async () => {
    storage.set('account', JSON.stringify(CACHED));
    location.pathname = '/user/profile';
    location.search = '?tab=security';
    answers.set('GET /api/user', { status: 403, data: SECOND_FACTOR });
    const { session, returnTo } = await freshSession();
    const navigate = vi.fn();
    const loaded = await session.load({ navigate });
    expect(navigate).toHaveBeenCalledWith('/authenticator', { replace: true });
    expect(cached()).toEqual(CACHED);
    expect(loaded.user).toEqual(CACHED);
    expect(returnTo.peek()).toBe('/user/profile?tab=security');
    expect(returnTo.peek()).toBe('/user/profile?tab=security');
    expect(returnTo.consume()).toBe('/user/profile?tab=security');
    expect(returnTo.peek()).toBe('');
  });

  it('caches nothing for a body that carries no profile while none is cached', async () => {
    location.pathname = '/user/profile';
    answers.set('GET /api/user', { status: 403, data: SECOND_FACTOR });
    const { session } = await freshSession();
    const navigate = vi.fn();
    expect(await session.load({ navigate })).toBeNull();
    expect(cached()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/authenticator', { replace: true });
  });

  it('caches the pending profile of a body that carries one', async () => {
    location.pathname = '/login';
    answers.set('GET /api/user', { status: 403, data: PENDING_PROFILE });
    const { session, returnTo } = await freshSession();
    const navigate = vi.fn();
    const loaded = await session.load({ navigate });
    expect(cached()).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com' });
    expect(loaded.user.name).toBe('Ada Lovelace');
    expect(navigate).toHaveBeenCalledWith('/complete-onboarding', { replace: true });
    expect(returnTo.peek()).toBe('');
  });

  it('follows a gate another client hands it, the mid-session onboarding_required keeping the cached profile and the page', async () => {
    storage.set('account', JSON.stringify(CACHED));
    location.pathname = '/user/organizations';
    const { session, returnTo } = await freshSession();
    const navigate = vi.fn();
    session.setNavigate(navigate);
    session.followPendingGate(refusal(ONBOARDING));
    expect(navigate).toHaveBeenCalledWith('/complete-onboarding/choose-2fa-method', {
      replace: true,
    });
    expect(cached()).toEqual(CACHED);
    expect(returnTo.peek()).toBe('/user/organizations');
  });

  it('remembers no auth page and keeps the page remembered before it', async () => {
    storage.set('intended_url', '/activate?user_code=ABCD-EFGH');
    location.pathname = '/authenticator';
    const { session, returnTo } = await freshSession();
    const navigate = vi.fn();
    session.setNavigate(navigate);
    session.followPendingGate(refusal(SECOND_FACTOR));
    expect(navigate).not.toHaveBeenCalled();
    expect(returnTo.peek()).toBe('/activate?user_code=ABCD-EFGH');
  });

  it('moves nowhere for a next on another origin, still remembers the page and answers false', async () => {
    location.pathname = '/user/profile';
    const { session, returnTo } = await freshSession();
    const navigate = vi.fn();
    session.setNavigate(navigate);
    const offOrigin = refusal({ ...SECOND_FACTOR, next: 'https://evil.example/' });
    expect(session.followPendingGate(offOrigin)).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(returnTo.peek()).toBe('/user/profile');
  });

  it('answers true when it moved the page and false when no navigate is held', async () => {
    location.pathname = '/user/profile';
    const { session } = await freshSession();
    expect(session.followPendingGate(refusal(SECOND_FACTOR))).toBe(false);
    const navigate = vi.fn();
    session.setNavigate(navigate);
    expect(session.followPendingGate(refusal(SECOND_FACTOR))).toBe(true);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("moves nobody who is already on a page of the gate's own chain", async () => {
    const { session } = await freshSession();
    const navigate = vi.fn();
    session.setNavigate(navigate);
    location.pathname = '/authenticator-method';
    expect(session.followPendingGate(refusal(SECOND_FACTOR))).toBe(false);
    location.pathname = '/qrcode';
    expect(session.followPendingGate(refusal(ONBOARDING))).toBe(false);
    location.pathname = '/complete-onboarding/backup-codes';
    expect(session.followPendingGate(refusal(ONBOARDING))).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(session.followPendingGate(refusal(SECOND_FACTOR))).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/authenticator', { replace: true });
  });

  it('settles load on a gate it followed, the session reading through its own client', async () => {
    location.pathname = '/user/profile';
    answers.set('GET /api/user', { status: 403, data: SECOND_FACTOR });
    const { session } = await freshSession();
    expect(await session.load({ navigate: vi.fn() })).toBeNull();
  });
});

describe('createApiClient handing a failure to onError', () => {
  const provider = { headers: () => Promise.resolve({}) };

  const outcomeOf = async request => {
    const seen = { state: 'unsettled' };
    request.then(
      () => {
        seen.state = 'resolved';
      },
      () => {
        seen.state = 'rejected';
      }
    );
    await Array.from({ length: 50 }).reduce(chain => chain.then(() => null), Promise.resolve());
    return seen.state;
  };

  const clientWith = async onError => {
    vi.resetModules();
    const { createApiClient } = await import('../../src/lib/apiClient.js');
    return createApiClient({ baseUrl: 'https://auth.test', session: provider, onError });
  };

  it('leaves the request unsettled while onError answers true, so the caller draws no failure', async () => {
    answers.set('GET /api/user/sessions', { status: 403, data: SECOND_FACTOR });
    const onError = vi.fn(() => true);
    const client = await clientWith(onError);
    expect(await outcomeOf(client.get('/api/user/sessions'))).toBe('unsettled');
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('throws the failure while onError answers false or nothing, a gate nobody followed included', async () => {
    answers.set('GET /api/user/sessions', { status: 403, data: SECOND_FACTOR });
    const refused = await clientWith(() => false);
    expect(await outcomeOf(refused.get('/api/user/sessions'))).toBe('rejected');
    const silent = await clientWith(() => undefined);
    await expect(silent.get('/api/user/sessions')).rejects.toMatchObject({
      status: 403,
      code: 'second_factor_required',
    });
  });

  it('throws an expected status without asking onError', async () => {
    answers.set('GET /api/user/sessions', { status: 403, data: SECOND_FACTOR });
    const onError = vi.fn(() => true);
    const client = await clientWith(onError);
    const request = client.get('/api/user/sessions', { expected: [403] });
    expect(await outcomeOf(request)).toBe('rejected');
    expect(onError).not.toHaveBeenCalled();
  });
});
