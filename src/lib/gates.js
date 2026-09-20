const PENDING_CODES = ['onboarding_required', 'terms_required'];
const SAFE_PATH = /^\/(?![/\\])/;

/**
 * Whether a failure is the site's onboarding or terms gate rather than an
 * error: a `403` whose `code` is `onboarding_required` or `terms_required`,
 * the shape both the cookie session's `load()` and every other
 * authenticated route answer while a person owes a step; the one predicate
 * `cookieSession.js`'s `onError`, `runtime.js`'s `onError` and every screen
 * that would otherwise log or notify on the refusal share, so a gate the
 * server designed is never reported as a client error.
 *
 * @param {{ status?: number, code?: string }} error - An `ApiError`
 * @returns {boolean} Whether the failure is a pending-gate refusal
 */
export const isPendingGate = error => error?.status === 403 && PENDING_CODES.includes(error?.code);

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
 * Whether a failure says the onboarding is over: a `403` whose `code` is
 * `not_pending`, the issuer's answer to a state read from a session that
 * owes no step.
 *
 * @param {{ status?: number, code?: string }} error - An `ApiError`
 * @returns {boolean}
 */
export const isNotPending = error => error?.status === 403 && error?.code === 'not_pending';
