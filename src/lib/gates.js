const GATE_PAGES = {
  onboarding_required: ['/complete-onboarding', '/qrcode'],
  terms_required: ['/oauth2/accept-terms'],
  second_factor_required: ['/authenticator'],
};
const SAFE_PATH = /^\/(?![/\\])/;

/**
 * Whether a failure is the site's onboarding, terms or second-factor gate
 * rather than an error: a `403` whose `code` is `onboarding_required`,
 * `terms_required` or `second_factor_required`, the shape both the cookie
 * session's `load()` and every other authenticated route answer while a
 * person owes a step, at sign-in and in the middle of a session alike; the
 * one predicate `cookieSession.js`'s `onError`, `runtime.js`'s `onError`
 * and every screen that would otherwise log or notify on the refusal
 * share, so a gate the server designed is never reported as a client
 * error.
 *
 * @param {{ status?: number, code?: string }} error - An `ApiError`
 * @returns {boolean} Whether the failure is a pending-gate refusal
 */
export const isPendingGate = error =>
  error?.status === 403 && Object.hasOwn(GATE_PAGES, error?.code || '');

/**
 * The page a pending-gate refusal names as `next`, when it is a
 * same-origin path starting with one slash; empty for any other value,
 * so a gate can never move the page off the origin.
 *
 * @param {{ data?: { next?: string } }} error - An `ApiError`
 * @returns {string} The path to move to, or empty
 */
export const pendingGateNext = error => {
  const next = typeof error?.data?.next === 'string' ? error.data.next : '';
  return SAFE_PATH.test(next) ? next : '';
};

/**
 * Whether a path is already a page of the gate's own chain: the code step
 * and its method picker for `second_factor_required`, the onboarding step
 * pages and the app enrollment page for `onboarding_required`, the
 * acceptance page for `terms_required`. A gate answered there moves
 * nobody, because the person is already paying what it asks.
 *
 * @param {{ code?: string }} error - An `ApiError`
 * @param {string} pathname - The current path
 * @returns {boolean} Whether the path belongs to the gate's chain
 */
export const onGatePage = (error, pathname) =>
  (GATE_PAGES[error?.code] || []).some(page => pathname.startsWith(page));

/**
 * Whether a failure says the onboarding is over: a `403` whose `code` is
 * `not_pending`, the issuer's answer to a state read from a session that
 * owes no step.
 *
 * @param {{ status?: number, code?: string }} error - An `ApiError`
 * @returns {boolean}
 */
export const isNotPending = error => error?.status === 403 && error?.code === 'not_pending';
