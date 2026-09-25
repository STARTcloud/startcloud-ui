const PARAMS = new URL(self.location.href).searchParams;
const APP_NAME = PARAMS.get('app') || 'Notification';
const CACHE_NAME = `startcloud-ui-${PARAMS.get('v') || '0'}`;
const PRECACHE = ['/manifest.json', '/brand/startcloud/mark.svg', '/brand/startcloud/icon.png'];

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
  event.waitUntil(self.clients.openWindow(event.notification.data?.navigate || '/'));
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
