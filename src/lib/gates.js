const PENDING_CODES = ['onboarding_required', 'terms_required'];

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
