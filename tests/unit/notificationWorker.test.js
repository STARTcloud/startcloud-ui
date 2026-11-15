import { readFileSync } from 'node:fs';
import vm from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

const SOURCE = readFileSync(new URL('../../public/notification-sw.js', import.meta.url), 'utf8');

const ORIGIN = 'https://auth.example';
const NAVIGATE = `${ORIGIN}/ciba/approve?token=7f3a`;
const REQUESTS = `${ORIGIN}/ciba/requests`;

const DATA = {
  navigate: NAVIGATE,
  actions: {
    approve: { method: 'POST', url: '/ciba/approve', body: { token: '7f3a' } },
    requests: { navigate: REQUESTS },
    foreign: { method: 'POST', url: 'https://evil.example/ciba/approve', body: {} },
    relative: { method: 'POST', url: '//evil.example/ciba/approve', body: {} },
  },
};

const answer = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const workerWith = ({
  cookies = { 'XSRF-TOKEN': 'xsrf-1' },
  cookieStore = true,
  response = () => Promise.resolve(answer(200, { status: 'approved' })),
  tabs = true,
  maxActions = 2,
} = {}) => {
  const listeners = {};
  const tab = {
    focus: vi.fn(() => Promise.resolve(tab)),
    navigate: vi.fn(() => Promise.resolve(tab)),
  };
  const cookieOf = name => (cookies[name] ? { name, value: cookies[name] } : null);
  const store = { get: vi.fn(name => Promise.resolve(cookieOf(name))) };
  const scope = {
    location: new URL(`${ORIGIN}/notification-sw.js?app=Test`),
    addEventListener: (type, listener) => {
      listeners[type] = listener;
    },
    registration: { showNotification: vi.fn(() => Promise.resolve()) },
    clients: {
      matchAll: vi.fn(() => Promise.resolve(tabs ? [tab] : [])),
      openWindow: vi.fn(() => Promise.resolve(null)),
    },
    cookieStore: cookieStore ? store : undefined,
    Notification: maxActions === null ? {} : { maxActions },
  };
  const send = vi.fn(response);
  vm.runInNewContext(SOURCE, { self: scope, caches: {}, fetch: send, URL, Response, Headers });
  return { listeners, scope, send, tab };
};

const dispatch = async (worker, type, event) => {
  const waits = [];
  worker.listeners[type]({ ...event, waitUntil: promise => waits.push(promise) });
  await Promise.all(waits);
};

const click = async (worker, action) => {
  const notification = { data: DATA, close: vi.fn() };
  await dispatch(worker, 'notificationclick', { action, notification });
  return notification;
};

describe('notificationclick', () => {
  it('sends a request entry with its method, JSON body, cookie and XSRF header, and stays put on a 2xx status', async () => {
    const worker = workerWith();
    const notification = await click(worker, 'approve');
    expect(notification.close).toHaveBeenCalled();
    expect(worker.send).toHaveBeenCalledWith('/ciba/approve', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': 'xsrf-1' },
      body: JSON.stringify({ token: '7f3a' }),
    });
    expect(worker.scope.clients.matchAll).not.toHaveBeenCalled();
    expect(worker.scope.clients.openWindow).not.toHaveBeenCalled();
  });

  it('takes the XSRF value from the __Host- cookie while it is set', async () => {
    const worker = workerWith({ cookies: { '__Host-XSRF-TOKEN': 'host-1' } });
    await click(worker, 'approve');
    expect(worker.send.mock.calls[0][1].headers['X-XSRF-TOKEN']).toBe('host-1');
  });

  it('follows the notice navigate on a non-2xx answer', async () => {
    const worker = workerWith({
      response: () => Promise.resolve(answer(403, { error: 'expired' })),
    });
    await click(worker, 'approve');
    expect(worker.send).toHaveBeenCalled();
    expect(worker.tab.navigate).toHaveBeenCalledWith(NAVIGATE);
  });

  it('follows the notice navigate on a 2xx answer without status', async () => {
    const worker = workerWith({ response: () => Promise.resolve(answer(200, {})) });
    await click(worker, 'approve');
    expect(worker.tab.navigate).toHaveBeenCalledWith(NAVIGATE);
  });

  it('follows the notice navigate when the request throws', async () => {
    const worker = workerWith({ response: () => Promise.reject(new TypeError('offline')) });
    await click(worker, 'approve');
    expect(worker.tab.navigate).toHaveBeenCalledWith(NAVIGATE);
  });

  it('follows the notice navigate without fetching while the XSRF cookie is missing', async () => {
    const worker = workerWith({ cookies: {} });
    await click(worker, 'approve');
    expect(worker.send).not.toHaveBeenCalled();
    expect(worker.tab.navigate).toHaveBeenCalledWith(NAVIGATE);
  });

  it('follows the notice navigate without fetching while the cookie store is missing', async () => {
    const worker = workerWith({ cookieStore: false });
    await click(worker, 'approve');
    expect(worker.send).not.toHaveBeenCalled();
    expect(worker.tab.navigate).toHaveBeenCalledWith(NAVIGATE);
  });

  it('never sends a url of another origin and follows the notice navigate', async () => {
    const worker = workerWith();
    await click(worker, 'foreign');
    await click(worker, 'relative');
    expect(worker.send).not.toHaveBeenCalled();
    expect(worker.tab.navigate).toHaveBeenNthCalledWith(1, NAVIGATE);
    expect(worker.tab.navigate).toHaveBeenNthCalledWith(2, NAVIGATE);
  });

  it('moves an open tab to the page of a navigate entry', async () => {
    const worker = workerWith();
    await click(worker, 'requests');
    expect(worker.tab.focus).toHaveBeenCalled();
    expect(worker.tab.navigate).toHaveBeenCalledWith(REQUESTS);
    expect(worker.send).not.toHaveBeenCalled();
  });

  it('opens a window on a navigate entry while no tab is open', async () => {
    const worker = workerWith({ tabs: false });
    await click(worker, 'requests');
    expect(worker.scope.clients.openWindow).toHaveBeenCalledWith(REQUESTS);
  });

  it('follows the notice navigate on a click on the body and on a press with no entry', async () => {
    const worker = workerWith();
    await click(worker, '');
    await click(worker, 'unknown');
    expect(worker.send).not.toHaveBeenCalled();
    expect(worker.tab.navigate).toHaveBeenNthCalledWith(1, NAVIGATE);
    expect(worker.tab.navigate).toHaveBeenNthCalledWith(2, NAVIGATE);
  });
});

describe('push', () => {
  const payload = {
    title: 'Sign-in request',
    body: 'monitor SSH is asking to sign you in on another device.',
    tag: 'ciba-7f3a',
    requireInteraction: true,
    navigate: NAVIGATE,
    actions: [
      { action: 'approve', title: 'Approve' },
      { action: 'deny', title: 'Deny' },
      { action: 'requests', title: 'Requests' },
    ],
    data: { actions: DATA.actions },
  };

  const push = async worker => {
    await dispatch(worker, 'push', { data: { json: () => payload } });
    return worker.scope.registration.showNotification.mock.calls[0];
  };

  it('draws no more buttons than maxActions and keeps the top-level navigate in data', async () => {
    const [title, options] = await push(workerWith());
    expect(title).toBe('Sign-in request');
    expect(options).toEqual({
      body: payload.body,
      tag: 'ciba-7f3a',
      requireInteraction: true,
      data: { actions: DATA.actions, navigate: NAVIGATE },
      actions: payload.actions.slice(0, 2),
    });
  });

  it('draws no button while maxActions is missing', async () => {
    const [, options] = await push(workerWith({ maxActions: null }));
    expect(options.actions).toEqual([]);
  });
});
