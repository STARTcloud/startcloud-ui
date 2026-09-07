import { authMethod } from '../utils/capabilities';

import { createApiClient } from './apiClient';
import { createSession } from './createSession';
import { createEventHub } from './eventHub';
import { createSessionEvents } from './events';
import { log } from './logger';

const PUBLIC = { auth: false };
const DATA_ATTRIBUTE = /^data-[a-z0-9-]+$/;
const PACK_NAME = /^[a-z0-9-]+$/;

const requestOriginFor = origin => (import.meta.env.DEV ? '' : origin);

const applyPack = pack => {
  if (document.documentElement.hasAttribute('data-brand')) {
    return;
  }
  if (!pack?.css || !PACK_NAME.test(pack.name || '')) {
    return;
  }
  document.documentElement.setAttribute('data-brand', pack.name);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = pack.css;
  document.head.appendChild(link);
};

const appendAnalytics = analytics => {
  if (!analytics?.script_url || !DATA_ATTRIBUTE.test(analytics.attribute || '')) {
    return;
  }
  const script = document.createElement('script');
  script.src = analytics.script_url;
  script.setAttribute(analytics.attribute, analytics.value ?? '');
  document.head.appendChild(script);
};

const onError = error =>
  log.api.error('Request failed', {
    method: error.request.method,
    url: error.request.url,
    status: error.status,
    message: error.message,
  });

export const events = createSessionEvents();

export const eventHub = createEventHub();

export let session = null;
export let returnTo = null;
export let client = null;
export let hubClient = null;
export let rules = null;

let apiOrigin = '';
let rulesPromise = null;

export const fetchHealth = () => client.get('/api/health', PUBLIC);

/**
 * Fetch the host's validation rules once, `GET /api/rules` without auth,
 * into the live `rules` binding every form reads through `useFormRules`;
 * a host that answers 404 has none, any other failure is logged, and in
 * both cases `rules` stays null and the app starts without them.
 *
 * @returns {Promise<Object|null>} The JSON Schema document, or null
 */
export const loadRules = () => {
  rulesPromise ||= client.get('/api/rules', PUBLIC).then(
    document => {
      rules = document;
      return document;
    },
    error => {
      if (error.status !== 404) {
        log.api.warn('Rules unavailable', { status: error.status, message: error.message });
      }
      return null;
    }
  );
  return rulesPromise;
};

/**
 * Open the tab's one event stream at the path the host's status names,
 * subscribed to every topic it advertises, the session's headers on the
 * request; a 401 ends the session on the bus.
 *
 * @param {Object} status - The payload from `probeStatus`
 */
export const connectEventStream = status => {
  const { path, topics } = status.events;
  eventHub.connect({
    url: `${requestOriginFor(apiOrigin)}${path}`,
    topics,
    headers: () => session.headers('GET', `${apiOrigin}${path}`),
    onUnauthorized: () => session.endSession(),
  });
};

export const disconnectEventStream = () => eventHub.disconnect();

/**
 * Create the singletons every feature calls through once the host's status
 * is known: the session provider and return-to helper from `createSession`,
 * the API client at the origin that serves the page (the dev proxy when
 * Vite serves it), and the notification hub client, the identity provider
 * itself for an `idp` host and the app's own backend otherwise; the
 * analytics script tag with its data attribute when the status carries
 * `analytics`; and the pack when the status carries `brand.pack`,
 * `data-brand` stamped from its `name` and its `css` appended as a
 * stylesheet link after the app's own, unless the served page already
 * carries `data-brand`, in which case nothing is touched. Runs once per
 * entry before anything renders; the exports are live bindings.
 *
 * @param {Object} status - The payload from `probeStatus`
 */
export const initRuntime = status => {
  apiOrigin = __API_ORIGIN__ || window.location.origin;
  appendAnalytics(status.analytics);
  applyPack(status.brand?.pack);
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
