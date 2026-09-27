import { hostFor, offline } from './fleet.js';
import { AGENT_MODE, denied, missing, unauthenticated } from './kit.js';
import { isAdmin, sessionOf } from './people.js';

const AGENT_PREFIX = AGENT_MODE ? '/api' : '/api/agents/:agent';

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

/**
 * What stands between a request and its route: a route that needs a
 * session answers 401 without a live token, and an admin's route answers
 * 403 to a person without `ROLE_ADMIN`.
 *
 * @param {Object} gate - The route's gate
 * @param {Object} req - The request
 * @returns {{ refused: Object|null, session: Object|null }} The refusal, or the session
 */
export const admit = (gate, req) => {
  const session = sessionOf(req);
  if (gate.session && !session) {
    return { refused: unauthenticated('Sign in first.'), session: null };
  }
  if (gate.admin && !isAdmin(session.person)) {
    return { refused: denied('This takes an administrator.'), session };
  }
  return { refused: null, session };
};
