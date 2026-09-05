import { authMethod } from '../utils/capabilities';

import { createBackendSession } from './backendSession';
import { createBrowserOidc } from './browserOidc';
import { createReturnTo } from './returnTo';

const STORAGE_KEY = 'intended_url';

/**
 * The session provider and the return-to helper for the host behind
 * `status`, chosen by its first `auth` token: `idp` is the browser as the
 * OIDC public client against `status.idp` with `/callback` as the only
 * auth path, anything else is the app's own backend session with `/login`
 * as the sign-in page.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} events - The bus from `createSessionEvents`
 * @returns {{ session: Object, returnTo: Object }} The provider `useSession` drives and the helper from `createReturnTo`
 */
export const createSession = (status, events) => {
  if (authMethod(status) === 'idp') {
    return {
      session: createBrowserOidc({
        ...status.idp,
        events,
        apiBase: import.meta.env.DEV ? '' : status.idp.issuer,
      }),
      returnTo: createReturnTo({ storageKey: STORAGE_KEY, authPaths: ['/callback'] }),
    };
  }
  return {
    session: createBackendSession({ baseUrl: window.location.origin, events }),
    returnTo: createReturnTo({
      storageKey: STORAGE_KEY,
      signInPath: '/login',
      authPaths: ['/login', '/register', '/auth/', '/setup'],
    }),
  };
};
