/**
 * The server's own message from a failed request, else the given fallback.
 * @param {Object} error - The thrown error, an `ApiError` or an axios failure
 * @param {string} fallback - Shown when the response carries no message
 * @returns {string}
 */
export const responseMessage = (error, fallback) => error?.response?.data?.message || fallback;
