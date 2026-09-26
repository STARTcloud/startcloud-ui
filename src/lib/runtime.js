import { authMethod } from '../utils/capabilities';

import { createApiClient } from './apiClient';
import { createSession } from './createSession';
import { createEventHub } from './eventHub';
import { createSessionEvents } from './events';
import { isPendingGate } from './gates';
import { log } from './logger';

const PUBLIC = { auth: false };
const DATA_ATTRIBUTE = /^data-[a-z0-9-]+$/;
const PACK_NAME = /^[a-z0-9-]+$/;
const SAME_ORIGIN_PATH = /^\/(?![/\\])/;
const PACK_LINK_ID = 'brand-pack';
const PACK_KEY = 'pack';
const PACKS_KEY = 'packs';

const requestOriginFor = origin => (import.meta.env.DEV ? '' : origin);

const validPack = pack =>
  Boolean(pack?.css) && SAME_ORIGIN_PATH.test(pack.css) && PACK_NAME.test(pack.name || '');

/**
 * The packs a person may choose on this host, `brand.packs` of the status,
 * the host's own list or every pack of the build when the host names none,
 * with every malformed entry dropped.
 *
 * @param {Object} brand - `status.brand`
 * @returns {Array<{ name: string, css: string, label: string }>} The offered packs
 */
export const offeredPacks = brand =>
  (Array.isArray(brand?.packs) ? brand.packs : []).filter(
    pack => validPack(pack) && typeof pack.label === 'string'
  );

/**
 * The pack the person chose on this host, read from the `pack` key beside
 * `theme`, or null while the choice is unset or names a pack the host no
 * longer offers.
 *
 * @param {Array<{ name: string }>} packs - The offered packs
 * @returns {Object|null} The chosen pack
 */
export const chosenPack = packs => {
  const name = localStorage.getItem(PACK_KEY) || '';
  return packs.find(pack => pack.name === name) || null;
};

/**
 * Paint the page in a pack: `data-brand` stamped from its name and its
 * stylesheet linked last in the head, after the app's own, so a tie on
 * specificity goes to the pack; null removes the person's own link and the
 * attribute, leaving whatever the served page stamped. A pack the served
 * page already stamped is left as it is.
 *
 * @param {{ name: string, css: string }|null} pack - The pack to paint, or null for none
 */
export const applyPack = pack => {
  const root = document.documentElement;
  const link = document.getElementById(PACK_LINK_ID);
  if (!validPack(pack)) {
    link?.remove();
    root.removeAttribute('data-brand');
    return;
  }
  if (!link && root.getAttribute('data-brand') === pack.name) {
    return;
  }
  const element = link || document.createElement('link');
  element.rel = 'stylesheet';
  element.id = PACK_LINK_ID;
  if (element.getAttribute('href') !== pack.css) {
    element.href = pack.css;
  }
  root.setAttribute('data-brand', pack.name);
  document.head.appendChild(element);
};

const paintBrand = brand => {
  const packs = offeredPacks(brand);
  if (packs.length > 0) {
    localStorage.setItem(PACKS_KEY, JSON.stringify(packs));
  } else {
    localStorage.removeItem(PACKS_KEY);
  }
  const chosen = chosenPack(packs);
  if (chosen) {
    applyPack(chosen);
    return;
  }
  if (!document.documentElement.hasAttribute('data-brand') && validPack(brand?.pack)) {
    applyPack(brand.pack);
  }
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

const onError = error => {
  if (isPendingGate(error)) {
    return;
  }
  log.api.error('Request failed', {
    method: error.request.method,
    url: error.request.url,
    status: error.status,
    message: error.message,
  });
};

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
 * request; a 401 ends the session on the bus. A path carrying a scheme or
 * a protocol-relative prefix is ignored, so the status payload can never
 * point the session's headers at another host.
 *
 * @param {Object} status - The payload from `probeStatus`
 */
export const connectEventStream = status => {
  const { path, topics } = status.events;
  if (!SAME_ORIGIN_PATH.test(path || '')) {
    return;
  }
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
 * carries `data-brand`, in which case nothing is touched; the packs the
 * host offers a person, `brand.packs`, the host's own list or every pack
 * of the build when the host names none, cached under `packs` for the
 * pre-paint script, and the person's own choice under `pack`, when it
 * names an offered pack, painted over the host's. Runs once per entry
 * before anything renders; the exports are live bindings.
 *
 * @param {Object} status - The payload from `probeStatus`
 */
export const initRuntime = status => {
  apiOrigin = __API_ORIGIN__ || window.location.origin;
  appendAnalytics(status.analytics);
  paintBrand(status.brand);
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
