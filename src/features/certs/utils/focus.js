/**
 * Moves focus to the next sensible control after a state change: the
 * element given, or the element of that id, made focusable with
 * `tabindex="-1"` while it is not; nothing while neither is on the page.
 *
 * @param {HTMLElement|string|null|undefined} target - The element, or its id
 */
export const focusOn = target => {
  const element = typeof target === 'string' ? document.getElementById(target) : target;
  if (!element) {
    return;
  }
  if (!element.hasAttribute('tabindex') && element.tabIndex < 0) {
    element.setAttribute('tabindex', '-1');
  }
  element.focus({ preventScroll: true });
};
