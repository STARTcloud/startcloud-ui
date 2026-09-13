/**
 * The translated label of one bulk answer's error code: the page's own
 * `<ns>.errors.<code>` key first, the shared `errors.<code>` fallback
 * otherwise, the bare code when neither names it.
 *
 * @param {Function} t - The translator
 * @param {string} ns - The bulk namespace, e.g. `admin.users.bulk`
 * @param {string} code - The error's code
 * @returns {string} The label
 */
export const codeLabel = (t, ns, code) => t(`${ns}.errors.${code}`, t(`errors.${code}`, code));

/**
 * The one result line under a heading after a bulk call: processed,
 * skipped and, for every distinct error code, its translated label and
 * count, `null` before any call has answered.
 *
 * @param {Function} t - The translator
 * @param {string} ns - The bulk namespace, e.g. `admin.users.bulk`
 * @param {{processed: number, skipped: number, errors: Array}|null} result - The bulk answer
 * @returns {string|null} The line
 */
export const resultLineOf = (t, ns, result) => {
  if (!result) {
    return null;
  }
  const counts = {};
  (result.errors || []).forEach(({ code }) => {
    counts[code] = (counts[code] || 0) + 1;
  });
  const codes = Object.entries(counts).map(
    ([code, count]) => `${codeLabel(t, ns, code)} (${count})`
  );
  const base = t(`${ns}.result`, {
    processed: result.processed || 0,
    skipped: result.skipped || 0,
    errors: (result.errors || []).length,
  });
  return codes.length > 0 ? `${base} ${codes.join(', ')}.` : base;
};
