import { hostFor, offline } from './fleet.js';
import { AGENT_MODE, APIKEY_MODE, denied, missing, typedProblem, unauthenticated } from './kit.js';
import { credentialOf, forgedRequest, isAdmin, refusedCookies, sessionOf } from './people.js';

const AGENT_PREFIX = AGENT_MODE ? '/api' : '/api/agents/:agent';
const KEY_REQUIRED =
  'API key required - provide either X-API-Key header or Authorization: Bearer header';
const INVALID_KEY = 'Invalid API key';
const CROSS_SITE = 'Cross-site request refused';
const AUTHENTICATION = {
  status: 401,
  name: 'authentication',
  title: 'Authentication is required.',
};
const FORBIDDEN = { status: 403, name: 'forbidden', title: 'The request is not allowed.' };

const agentRefusal = (kind, detail) => typedProblem({ ...kind, more: { detail, errors: [] } });

const routes = [];
const sockets = [];

const toRegex = pattern =>
  new RegExp(`^${pattern.replace(/:(?<name>[a-z_]+)/g, '(?<$<name>>[^/]+)')}$`);

const route = (method, pattern, handler, gate = {}) => {
  routes.push({ method, regex: toRegex(pattern), handler, gate });
};

export const publicRoute = (method, pattern, handler) => route(method, pattern, handler);

export const sessionRoute = (method, pattern, handler) =>
  route(method, pattern, handler, { session: true });

export const adminRoute = (method, pattern, handler) =>
  route(method, pattern, handler, { session: true, admin: true });

/**
 * A route of an agent, at `/api/agents/{id}/…` on the server role and at
 * `/api/…` on an agent role: no such agent answers 404, an agent the
 * server cannot reach answers 502 as a bad gateway.
 *
 * @param {string} method - The HTTP method
 * @param {string} pattern - The agent path, no leading slash
 * @param {Function} handler - Called with the context and its `host`
 * @returns {void}
 */
export const agentRoute = (method, pattern, handler) =>
  sessionRoute(method, `${AGENT_PREFIX}/${pattern}`, ctx => {
    const host = hostFor(ctx.params.agent);
    if (!host) {
      return missing('No such agent');
    }
    return host.online ? handler({ ...ctx, host }) : offline(host);
  });

export const socketRoute = (pattern, handler) => {
  sockets.push({ regex: toRegex(`${AGENT_PREFIX}/${pattern}`), handler });
};

const matched = (entry, pathname) => ({
  entry,
  params: entry.regex.exec(pathname).groups || {},
});

export const matchRoute = (method, pathname) => {
  const entry = routes.find(
    candidate => candidate.method === method && candidate.regex.test(pathname)
  );
  return entry ? matched(entry, pathname) : null;
};

export const matchSocket = pathname => {
  const entry = sockets.find(candidate => candidate.regex.test(pathname));
  return entry ? matched(entry, pathname) : null;
};

const noSession = req => {
  if (!APIKEY_MODE) {
    return unauthenticated('Sign in first.');
  }
  if (credentialOf(req)) {
    return agentRefusal(FORBIDDEN, INVALID_KEY);
  }
  return { ...agentRefusal(AUTHENTICATION, KEY_REQUIRED), headers: refusedCookies(req) };
};

const notAdmin = session => {
  if (!APIKEY_MODE) {
    return denied('This takes an administrator.');
  }
  const role = session.payload.key_role || 'viewer';
  return agentRefusal(
    FORBIDDEN,
    `Insufficient role: this operation requires 'admin' (key role: '${role}')`
  );
};

/**
 * What stands between a request and its route: a route that needs a
 * session answers 401 without a live token, and an admin's route answers
 * 403 to a person without `ROLE_ADMIN`; on the `hyperweaver-agent` role
 * the refusals are the agent's middleware's own, a problem body of the
 * status's registry type with the sentence as `detail` and an empty
 * `errors` list, 403 on every route for a request riding the session
 * cookie on a method but GET, HEAD and OPTIONS whose `Sec-Fetch-Site`
 * names another site and whose `Origin` host differs from `Host`, 401
 * with no credential, clearing the session cookie when the request
 * carried a dead one, 403 for an unknown key and 403
 * for a role too low, while the sign-in routes of `agent-settings.js`
 * keep the `{ msg }` bodies of the agent's sign-in brief.
 *
 * @param {Object} gate - The route's gate
 * @param {Object} req - The request
 * @returns {{ refused: Object|null, session: Object|null }} The refusal, or the session
 */
export const admit = (gate, req) => {
  if (forgedRequest(req)) {
    return { refused: agentRefusal(FORBIDDEN, CROSS_SITE), session: null };
  }
  const session = sessionOf(req);
  if (gate.session && !session) {
    return { refused: noSession(req), session: null };
  }
  if (gate.admin && !isAdmin(session.person)) {
    return { refused: notAdmin(session), session };
  }
  return { refused: null, session };
};
