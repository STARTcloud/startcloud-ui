import { lazy } from 'react';

export { createNotificationsAdapter, createPushAdapter } from './api/adapters';
export { createNotificationsClient, hasNotificationsScope } from './api/inbox';
export { createPush } from './api/push';
export { shortcuts } from './shortcuts';

export const InboxPage = lazy(() => import('./components/InboxPage'));
