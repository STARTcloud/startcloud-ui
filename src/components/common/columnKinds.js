/**
 * The content kinds a table cell may draw, each with the width its column
 * takes: `name` (text with an optional icon or logo and a muted code
 * beside it, ellipsized), `text` (a plain string, ellipsized), `badge`
 * (one status badge), `badges` (a list of small badges), `date` (a locale
 * date), `relative` (a relative time), `count` (a right-aligned integer),
 * `size` (formatted bytes), `checksum` (the `ChecksumCell`, ellipsized),
 * `link` (a link cell, the version and release names and a search hit's
 * title, sharing the room the way a name does) and `word` (a closed-list
 * word). A width is `narrow`, `medium` or `flex`; the fixed
 * two are declared once in the stylesheet as `.col-w-<width>`, and the
 * `flex` columns share whatever room the fixed ones leave, so a wide
 * table fills its space and a narrow one shrinks the text that can
 * shrink. Every `col`, `th` and `td` also carries `.col-k-<kind>`, the
 * class the stylesheet styles a kind's cells by, never a column key.
 */
export const KINDS = {
  name: { width: 'flex' },
  text: { width: 'flex' },
  badge: { width: 'narrow' },
  badges: { width: 'flex' },
  date: { width: 'narrow' },
  relative: { width: 'medium' },
  count: { width: 'narrow' },
  size: { width: 'narrow' },
  checksum: { width: 'flex' },
  link: { width: 'flex' },
  word: { width: 'narrow' },
};

export const KIND_NAMES = Object.keys(KINDS);

/**
 * The classes of a column kind: its width class, `col-w-narrow`,
 * `col-w-medium` or `col-w-flex`, and its kind class, `col-k-<kind>`.
 *
 * @param {string} kind One of `KINDS`
 * @returns {string} The classes the column's `col`, `th` and `td` carry
 */
export const kindClasses = kind => `col-w-${KINDS[kind].width} col-k-${kind}`;

/**
 * Whether a column kind takes its width from the room the fixed columns
 * leave.
 *
 * @param {string} kind One of `KINDS`
 * @returns {boolean} True for a `flex` kind
 */
export const isFlexKind = kind => KINDS[kind].width === 'flex';
