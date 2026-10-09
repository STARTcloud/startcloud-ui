const ROWS =
  '.app-scroll .items-table tbody tr:not(.detail-row):not(.table-group-row):not(.empty-row), .app-scroll .catalog-card';

const SECTIONS = '.app-scroll .section-card-head, .app-scroll .section-heading';

export const CURSOR_CLASS = 'kbd-cursor';

const rowsOf = root => [...root.querySelectorAll(ROWS)];

const focusInView = node => {
  if (!node.hasAttribute('tabindex')) {
    node.setAttribute('tabindex', '-1');
  }
  node.focus({ preventScroll: true });
  node.scrollIntoView({ block: 'nearest' });
};

/**
 * The row the keyboard selection stands on, the one carrying the cursor
 * class in the page's scroll region; null while none does.
 *
 * @param {Document} root - The document
 * @returns {Element|null} The row
 */
export const cursorOf = root => root.querySelector(`.app-scroll .${CURSOR_CLASS}`);

/**
 * Moves the keyboard selection one row down or up through the page's
 * table rows and cards, the first row when none is selected, the moved-to
 * row focused and scrolled into view.
 *
 * @param {Document} root - The document
 * @param {number} step - 1 for down, -1 for up
 * @returns {Element|null} The row selected
 */
export const moveCursor = (root, step) => {
  const rows = rowsOf(root);
  if (rows.length === 0) {
    return null;
  }
  const current = cursorOf(root);
  const index = rows.indexOf(current);
  const first = step > 0 ? 0 : rows.length - 1;
  const at = index === -1 ? first : index + step;
  const next = rows[Math.min(rows.length - 1, Math.max(0, at))];
  if (current && current !== next) {
    current.classList.remove(CURSOR_CLASS);
  }
  next.classList.add(CURSOR_CLASS);
  focusInView(next);
  return next;
};

/**
 * The link the selected row opens, the first link with an `href` in it.
 *
 * @param {Document} root - The document
 * @returns {HTMLAnchorElement|null} The link
 */
export const cursorLink = root => cursorOf(root)?.querySelector('a[href]') || null;

/**
 * Clicks the first control of a selector inside the selected row.
 *
 * @param {Document} root - The document
 * @param {string} selector - The control's selector
 * @returns {boolean} Whether a control was clicked
 */
export const clickInCursor = (root, selector) => {
  const control = cursorOf(root)?.querySelector(selector);
  control?.click();
  return Boolean(control);
};

/**
 * Clicks the first control of a selector in the page's scroll region.
 *
 * @param {Document} root - The document
 * @param {string} selector - The control's selector
 * @returns {boolean} Whether a control was clicked
 */
export const clickInPage = (root, selector) => {
  const control = root.querySelector(`.app-scroll ${selector}`);
  control?.click();
  return Boolean(control);
};

/**
 * Moves the focus to the next or previous section heading of the page,
 * the one after the heading nearest above the viewport's middle, scrolled
 * into view.
 *
 * @param {Document} root - The document
 * @param {number} step - 1 for next, -1 for previous
 * @returns {Element|null} The heading focused
 */
export const moveSection = (root, step) => {
  const headings = [...root.querySelectorAll(SECTIONS)];
  if (headings.length === 0) {
    return null;
  }
  const focused = headings.findIndex(heading => heading.contains(root.activeElement));
  const middle = window.innerHeight / 2;
  const nearest = headings.reduce(
    (held, heading, index) => (heading.getBoundingClientRect().top <= middle ? index : held),
    -1
  );
  const forward = step > 0 ? nearest + 1 : nearest;
  const at = focused === -1 ? forward : focused + step;
  const next = headings[Math.min(headings.length - 1, Math.max(0, at))];
  focusInView(next.querySelector('button') || next);
  return next;
};
