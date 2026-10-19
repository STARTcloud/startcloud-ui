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

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
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

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(cacheFirst(request, SHELL));
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

  const { title, body, icon, tag, data, actions } = payload;

  event.waitUntil(
    self.registration.showNotification(title || APP_NAME, {
      body,
      icon,
      tag,
      data,
      actions,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.navigate || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const open = clients.find(client => 'focus' in client);
      if (!open) {
        return self.clients.openWindow(target);
      }
      return open
        .focus()
        .then(focused => (focused && 'navigate' in focused ? focused.navigate(target) : focused));
    })
  );
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
