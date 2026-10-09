import { authMethod, hasFeature } from '../utils/capabilities';

import { createApiClient } from './apiClient';
import { createSession } from './createSession';
import { createEventHub } from './eventHub';
import { createSessionEvents } from './events';
import { isPendingGate } from './gates';
import { log } from './logger';
import { streamTargetFor } from './streamTarget';

const PUBLIC = { auth: false };
const DATA_ATTRIBUTE = /^data-[a-z0-9-]+$/;
const THEME_NAME = /^[a-z0-9-]+$/;
const SAME_ORIGIN_PATH = /^\/(?![/\\])/;
const THEME_LINK_ID = 'brand-theme';
const THEME_KEY = 'theme';
const THEMES_KEY = 'themes';
const OPENSEARCH_PATH = '/opensearch.xml';

const requestOriginFor = origin => (import.meta.env.DEV ? '' : origin);

const validTheme = theme =>
  Boolean(theme?.css) && SAME_ORIGIN_PATH.test(theme.css) && THEME_NAME.test(theme.name || '');

/**
 * The themes a person may choose on this host, `brand.themes` of the
 * status, the host's own list or every theme of the build when the host
 * names none, with every malformed entry dropped.
 *
 * @param {Object} brand - `status.brand`
 * @returns {Array<{ name: string, css: string, label: string }>} The offered themes
 */
export const offeredThemes = brand =>
  (Array.isArray(brand?.themes) ? brand.themes : []).filter(
    theme => validTheme(theme) && typeof theme.label === 'string'
  );

/**
 * The theme the person chose on this host, read from the `theme` key
 * beside `mode`, or null while the choice is unset or names a theme the
 * host no longer offers.
 *
 * @param {Array<{ name: string }>} themes - The offered themes
 * @returns {Object|null} The chosen theme
 */
export const chosenTheme = themes => {
  const name = localStorage.getItem(THEME_KEY) || '';
  return themes.find(theme => theme.name === name) || null;
};

/**
 * Paint the page in a theme: `data-brand` stamped from its name and its
 * stylesheet linked last in the head, after the app's own, so a tie on
 * specificity goes to the theme; null removes the person's own link and
 * the attribute, leaving whatever the served page stamped. A theme the
 * served page already stamped is left as it is.
 *
 * @param {{ name: string, css: string }|null} theme - The theme to paint, or null for none
 */
export const applyTheme = theme => {
  const root = document.documentElement;
  const link = document.getElementById(THEME_LINK_ID);
  if (!validTheme(theme)) {
    link?.remove();
    root.removeAttribute('data-brand');
    return;
  }
  if (!link && root.getAttribute('data-brand') === theme.name) {
    return;
  }
  const element = link || document.createElement('link');
  element.rel = 'stylesheet';
  element.id = THEME_LINK_ID;
  if (element.getAttribute('href') !== theme.css) {
    element.href = theme.css;
  }
  root.setAttribute('data-brand', theme.name);
  document.head.appendChild(element);
};

const paintBrand = brand => {
  const themes = offeredThemes(brand);
  if (themes.length > 0) {
    localStorage.setItem(THEMES_KEY, JSON.stringify(themes));
  } else {
    localStorage.removeItem(THEMES_KEY);
  }
  const chosen = chosenTheme(themes);
  if (chosen) {
    applyTheme(chosen);
    return;
  }
  if (!document.documentElement.hasAttribute('data-brand') && validTheme(brand?.theme)) {
    applyTheme(brand.theme);
  }
};

const linkOpenSearch = status => {
  if (!hasFeature(status, 'search')) {
    return;
  }
  const link = document.createElement('link');
  link.rel = 'search';
  link.type = 'application/opensearchdescription+xml';
  link.href = OPENSEARCH_PATH;
  link.title = status.brand.name;
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

const fetchRules = () =>
  client.get('/api/rules', PUBLIC).then(
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

/**
 * Fetch the host's validation rules once, `GET /api/rules` without auth,
 * into the live `rules` binding every form reads through `useFormRules`,
 * while the status lists the `rules` feature; a host that lists no
 * `rules` is never asked, a host that answers 404 has none, any other
 * failure is logged, and in every case `rules` stays null and the app
 * starts without them.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @returns {Promise<Object|null>} The JSON Schema document, or null
 */
export const loadRules = status => {
  rulesPromise ||= hasFeature(status, 'rules') ? fetchRules() : Promise.resolve(null);
  return rulesPromise;
};

/**
 * Open the tab's one event stream where `streamTargetFor` places it,
 * subscribed to its topics, the session's headers on the request signed
 * for the stream URL without its query; a 401 ends the session on the
 * bus. A path on any host but the serving origin and, on an `idp` host,
 * the identity provider's own `/api/events` is ignored, so the status
 * payload can never point the session's headers at another host.
 *
 * @param {Object} status - The payload from `probeStatus`
 */
export const connectEventStream = status => {
  const target = streamTargetFor(status, apiOrigin);
  if (!target) {
    return;
  }
  eventHub.connect({
    url: `${requestOriginFor(target.origin)}${target.path}`,
    topics: target.topics,
    headers: () => session.headers('GET', `${target.origin}${target.path}`),
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
 * `analytics`; and the theme when the status carries `brand.theme`,
 * `data-brand` stamped from its `name` and its `css` appended as a
 * stylesheet link after the app's own, unless the served page already
 * carries `data-brand`, in which case nothing is touched; the themes the
 * host offers a person, `brand.themes`, the host's own list or every
 * theme of the build when the host names none, cached under `themes` for
 * the pre-paint script, and the person's own choice under `theme`, when
 * it names an offered theme, painted over the host's; and while the host
 * lists `search`, the `search` link to the OpenSearch description the
 * backend serves at `/opensearch.xml`, titled with the brand's name. Runs once per entry
 * before anything renders; the exports are live bindings.
 *
 * @param {Object} status - The payload from `probeStatus`
 */
export const initRuntime = status => {
  apiOrigin = __API_ORIGIN__ || window.location.origin;
  appendAnalytics(status.analytics);
  paintBrand(status.brand);
  linkOpenSearch(status);
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
