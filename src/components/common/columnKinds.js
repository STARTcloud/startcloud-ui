/**
 * The content kinds a table cell may draw, each with the width class its
 * column takes: `name` (text with an optional icon or logo and a muted code
 * beside it, ellipsized), `text` (a plain string), `badge` (one status
 * badge), `badges` (a list of small badges), `date` (a locale date),
 * `relative` (a relative time), `count` (a right-aligned integer), `size`
 * (formatted bytes), `checksum` (the `ChecksumCell`), `link` (a link cell,
 * the version and release names), `action` (a button such as Download) and
 * `word` (a closed-list word). The widths are `narrow`, `medium`, `wide` or
 * `flex`, declared once in the stylesheet as `.col-w-<width>`.
 */
export const KINDS = {
  name: { width: 'wide' },
  text: { width: 'medium' },
  badge: { width: 'narrow' },
  badges: { width: 'wide' },
  date: { width: 'narrow' },
  relative: { width: 'medium' },
  count: { width: 'narrow' },
  size: { width: 'narrow' },
  checksum: { width: 'medium' },
  link: { width: 'medium' },
  action: { width: 'medium' },
  word: { width: 'narrow' },
};

export const KIND_NAMES = Object.keys(KINDS);

/**
 * The width class of a column kind, `col-w-narrow`, `col-w-medium`,
 * `col-w-wide` or `col-w-flex`.
 *
 * @param {string} kind One of `KINDS`
 * @returns {string} The class the column's `col`, `th` and `td` carry
 */
export const widthClass = kind => `col-w-${KINDS[kind].width}`;
