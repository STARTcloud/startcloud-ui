const SAFE_PATH = /^\/(?![/\\])/;
const PAGES = [
  '/login',
  '/authenticator',
  '/authenticator-method',
  '/passwordRecovery',
  '/passwordReset',
  '/registration',
  '/complete-onboarding',
  '/qrcode',
  '/oauth2/accept-terms',
  '/oauth2/consent',
  '/oauth2/code',
  '/provider-registration/tos',
  '/public/policies',
  '/activate',
  '/activated',
  '/ciba/approve',
  '/connect/logout/confirm',
  '/connect/logout/frontchannel',
  '/continue',
  '/link-account-consent',
  '/user',
  '/org/invite',
  '/notifications',
  '/profile',
  '/admin',
  '/org-console',
  '/organizations',
  '/about',
  '/search',
  '/error',
];

const pathnameOf = target => target.split(/[?#]/)[0];

const parseUrl = target => {
  try {
    return new URL(target);
  } catch {
    return null;
  }
};

/**
 * Whether a path is a page of the identity contract or of the pages
 * contract, one the router draws in place; a protocol path such as
 * `/oauth2/authorize` is not.
 *
 * @param {string} target - A path, with or without a query
 * @returns {boolean}
 */
export const isPagePath = target => {
  const pathname = pathnameOf(target);
  return (
    pathname === '/' || PAGES.some(page => pathname === page || pathname.startsWith(`${page}/`))
  );
};

/**
 * Follow the `next` a sign-in step answered: a path is accepted only when it
 * matches `^/(?![/\\])`, `/` yields to the consumed `intended_url`, a page
 * path navigates in-router and any other path is a top-level navigation;
 * an absolute URL is followed only when its origin is the serving origin,
 * or when the caller marks it `trusted` because the server validated it
 * against the client's registered URIs; anything else lands on the
 * consumed return path or home. A step that established a session hands
 * the bus as `events`, and `login` is emitted on it only where the page
 * stays in-router, so a page the browser is about to leave never redraws
 * as a signed-in one while the top-level navigation is under way.
 *
 * @param {Object} options - The step's answer and the router's side
 * @param {string} options.next - The answered `next`
 * @param {Function} options.navigate - The router's `navigate`
 * @param {Object} options.returnTo - The helper from `createReturnTo`
 * @param {boolean} [options.trusted] - Follow an absolute URL of any origin
 * @param {{ emit: Function }|null} [options.events] - The session bus, when the step signed the person in
 */
export const followNext = ({ next, navigate, returnTo, trusted = false, events = null }) => {
  const stay = target => {
    events?.emit('login');
    navigate(target, { replace: true });
  };
  const target = typeof next === 'string' ? next : '';
  if (SAFE_PATH.test(target)) {
    const resolved = pathnameOf(target) === '/' ? returnTo.consume() || '/' : target;
    if (isPagePath(resolved)) {
      stay(resolved);
    } else {
      window.location.assign(resolved);
    }
    return;
  }
  const url = parseUrl(target);
  if (url && (trusted || url.origin === window.location.origin)) {
    window.location.assign(url.href);
    return;
  }
  stay(returnTo.consume() || '/');
};
