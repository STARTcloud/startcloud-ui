import { authMethod } from '../utils/capabilities';

import { createApiClient } from './apiClient';
import { createSession } from './createSession';
import { createSessionEvents } from './events';
import { log } from './logger';

const PUBLIC = { auth: false };

const requestOriginFor = origin => (import.meta.env.DEV ? '' : origin);

const onError = error =>
  log.api.error('Request failed', {
    method: error.request.method,
    url: error.request.url,
    status: error.status,
    message: error.message,
  });

export const events = createSessionEvents();

export let session = null;
export let returnTo = null;
export let client = null;
export let hubClient = null;

export const fetchHealth = () => client.get('/api/health', PUBLIC);

/**
 * Create the singletons every feature calls through once the host's status
 * is known: the session provider and return-to helper from `createSession`,
 * the API client at the origin that serves the page (the dev proxy when
 * Vite serves it), and the notification hub client, the identity provider
 * itself for an `idp` host and the app's own backend otherwise. Runs once
 * per entry before anything renders; the exports are live bindings.
 *
 * @param {Object} status - The payload from `probeStatus`
 */
export const initRuntime = status => {
  const apiOrigin = __API_ORIGIN__ || window.location.origin;
  ({ session, returnTo } = createSession(status, events));
  client = createApiClient({
    baseUrl: apiOrigin,
    requestOrigin: requestOriginFor(apiOrigin),
    session,
    onError,
  });
  hubClient =
    authMethod(status) === 'idp'
      ? createApiClient({
          baseUrl: status.idp.issuer,
          requestOrigin: requestOriginFor(status.idp.issuer),
          session,
        })
      : client;
};
