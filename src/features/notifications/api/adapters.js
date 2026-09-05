import { PUSH_ENABLED_KEY } from '../../../config/constants';
import { authMethod } from '../../../utils/capabilities';

import { createNotificationsClient } from './inbox';
import { createPush } from './push';

const PUBLIC = { auth: false };

const PATHS = {
  backend: {
    vapidKey: '/api/notifications/vapid-key',
    subscriptions: '/api/notifications/subscriptions',
    testToast: '/api/notifications/test/toast',
    testChannel: '/api/notifications/test/channel',
    unsubscribeOptions: endpoint => ({ body: { endpoint } }),
  },
  idp: {
    vapidKey: '/api/push/vapid-key',
    subscriptions: '/api/push/subscriptions',
    testToast: '/api/push/test-toast',
    testChannel: '/api/push/test-channel',
    unsubscribeOptions: endpoint => ({ params: { endpoint } }),
  },
};

/**
 * The inbox adapter the user menu's bell reads: the hub client's five
 * calls plus the host's channel test, its path chosen by the first `auth`
 * token (the app's own backend proxies the hub for `backend`, the Worker's
 * push routes answer for `idp`).
 *
 * @param {Object} options - The runtime pieces
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {Object} options.client - The API client at the host
 * @param {Object} options.hubClient - The API client at the notification hub
 * @returns {Object} The adapter `NotificationsItem` and `NotificationsModal` read
 */
export const createNotificationsAdapter = ({ status, client, hubClient }) => ({
  ...createNotificationsClient({ client: hubClient }),
  sendTest: () => client.post(PATHS[authMethod(status)].testChannel, {}),
});

/**
 * The browser push subscription behind the notifications switch and the
 * adapter the modal drives it through, the host's push paths chosen by the
 * first `auth` token and the service worker tagged with the brand name.
 *
 * @param {Object} options - The runtime pieces
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {Object} options.client - The API client at the host
 * @returns {{ push: Object, pushAdapter: Object }} The functions `useSession` syncs and the adapter the modal reads
 */
export const createPushAdapter = ({ status, client }) => {
  const paths = PATHS[authMethod(status)];
  const push = createPush({
    storageKey: PUSH_ENABLED_KEY,
    serviceWorkerUrl: `/notification-sw.js?app=${encodeURIComponent(status.brand.name)}`,
    getVapidKey: () => client.get(paths.vapidKey, PUBLIC).then(data => data.publicKey),
    createSubscription: subscription => client.post(paths.subscriptions, subscription),
    deleteSubscription: endpoint =>
      client.delete(paths.subscriptions, paths.unsubscribeOptions(endpoint)),
  });
  return {
    push,
    pushAdapter: {
      isSupported: push.isPushSupported,
      isEnabled: push.isPushEnabled,
      setEnabled: push.setPushEnabled,
      subscribe: push.subscribePush,
      unsubscribe: push.unsubscribePush,
      sendTest: () => client.post(paths.testToast, {}),
    },
  };
};
