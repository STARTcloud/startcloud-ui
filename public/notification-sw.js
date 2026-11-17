const PARAMS = new URL(self.location.href).searchParams;
const APP_NAME = PARAMS.get('app') || 'Notification';
const VERSION = '__APP_VERSION__';
const BUILD = '__APP_BUILD__';
const FILES = '__APP_FILES__';
const CACHE_NAME = `startcloud-ui-${VERSION}-${BUILD}`;
const SHELL = '/';
const STATUS = '/api/status';
const PRECACHE = [SHELL, STATUS, ...(Array.isArray(FILES) ? FILES : [])];
const KEPT = ['/assets/', '/locales/', '/brand/', '/themes/', '/fonts/', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(names =>
        Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)))
      )
      .then(() => self.clients.claim())
  );
});

const TOKEN_KEY = '/__xsrf';

const keepToken = token =>
  caches
    .open(CACHE_NAME)
    .then(cache => cache.put(TOKEN_KEY, new Response(String(token || ''))))
    .catch(() => undefined);

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'version') {
    event.ports[0]?.postMessage({ version: VERSION });
  }
  if (event.data?.type === 'xsrf') {
    const kept = keepToken(event.data.token);
    if (typeof event.waitUntil === 'function') {
      event.waitUntil(kept);
    }
  }
});

const kept = url =>
  url.origin === self.location.origin && KEPT.some(prefix => url.pathname.startsWith(prefix));

const store = (key, response) => {
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(key, copy));
  }
  return response;
};

const cacheFirst = (request, key) =>
  caches
    .match(key)
    .then(hit => hit || fetch(request))
    .catch(() => Response.error());

const fromCache = hit => {
  const headers = new Headers(hit.headers);
  headers.set('X-Served-From', 'cache');
  return new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers });
};

const serverFirst = (request, key) =>
  fetch(request)
    .then(response => store(key, response))
    .catch(() => caches.match(key).then(hit => (hit ? fromCache(hit) : Response.error())));

const navigation = request =>
  fetch(request).catch(() =>
    caches.match(SHELL).then(hit => (hit ? fromCache(hit) : Response.error()))
  );

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(navigation(request));
    return;
  }
  const url = new URL(request.url);
  if (url.origin === self.location.origin && url.pathname === STATUS) {
    event.respondWith(serverFirst(request, STATUS));
    return;
  }
  if (kept(url)) {
    event.respondWith(cacheFirst(request, url.pathname));
  }
});

self.addEventListener('push', event => {
  if (!event.data) {
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const { title, body, icon, tag, data, actions, navigate, requireInteraction } = payload;
  const maxActions = self.Notification?.maxActions || 0;

  event.waitUntil(
    self.registration.showNotification(title || APP_NAME, {
      body,
      icon,
      tag,
      requireInteraction,
      data: { ...data, navigate },
      actions: Array.isArray(actions) ? actions.slice(0, maxActions) : [],
    })
  );
});

const XSRF_COOKIES = ['__Host-XSRF-TOKEN', 'XSRF-TOKEN'];

const openPage = target =>
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const open = clients.find(client => 'focus' in client);
    if (!open) {
      return self.clients.openWindow(target);
    }
    return open
      .focus()
      .then(focused => (focused && 'navigate' in focused ? focused.navigate(target) : focused));
  });

const ownPath = url =>
  typeof url === 'string' &&
  url.startsWith('/') &&
  !url.startsWith('//') &&
  new URL(url, self.location.origin).origin === self.location.origin;

const cookieToken = () => {
  if (!self.cookieStore) {
    return Promise.resolve('');
  }
  return Promise.all(XSRF_COOKIES.map(name => self.cookieStore.get(name)))
    .then(cookies => cookies.find(cookie => cookie?.value)?.value || '')
    .catch(() => '');
};

const keptToken = () =>
  Promise.resolve()
    .then(() => caches.open(CACHE_NAME))
    .then(cache => cache.match(TOKEN_KEY))
    .then(hit => (hit ? hit.text() : ''))
    .catch(() => '');

const xsrfToken = () => cookieToken().then(token => token || keptToken());

const answered = response =>
  response.ok ? response.json().then(answer => Boolean(answer?.status)) : false;

const headersWith = token => ({
  'Content-Type': 'application/json',
  ...(token ? { 'X-XSRF-TOKEN': token } : {}),
});

const send = (entry, token) =>
  fetch(entry.url, {
    method: entry.method,
    credentials: 'same-origin',
    headers: headersWith(token),
    body: JSON.stringify(entry.body),
  }).then(answered);

const request = entry =>
  xsrfToken()
    .then(token => send(entry, token))
    .catch(() => false);

const sendOrOpen = (entry, fallback) => {
  if (!ownPath(entry.url)) {
    return openPage(fallback);
  }
  return request(entry).then(sent => (sent ? null : openPage(fallback)));
};

const pressed = (data, action) => {
  const fallback = data?.navigate || '/';
  const actions = data?.actions || {};
  const entry = action && Object.hasOwn(actions, action) ? actions[action] : null;
  if (entry?.navigate) {
    return openPage(entry.navigate);
  }
  if (entry?.url) {
    return sendOrOpen(entry, fallback);
  }
  return openPage(fallback);
};

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(pressed(event.notification.data, event.action));
});

self.addEventListener('pushsubscriptionchange', event => {
  const applicationServerKey = event.oldSubscription?.options?.applicationServerKey;

  if (!applicationServerKey) {
    return;
  }

  const oldEndpoint = event.oldSubscription?.endpoint || null;

  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey })
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'pushsubscriptionchange', oldEndpoint });
        });
      })
  );
});
