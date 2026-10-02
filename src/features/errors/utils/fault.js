/**
 * Whether the served page carries a fault the server stamped on `<html>`,
 * `data-error-status`, the way the identity provider's `/error` dispatch
 * and any backend answering `index.html` in place of a failed browser
 * navigation stamp it.
 *
 * @returns {boolean} True while the document carries a stamped status
 */
export const hasServerFault = () =>
  Boolean(document.documentElement.getAttribute('data-error-status'));
