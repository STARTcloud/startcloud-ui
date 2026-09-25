/**
 * The content kinds a table cell may draw, each naming how the cell looks
 * and the fold priority it seeds: `name` (text with an optional icon or
 * logo and a muted code beside it), `text` (a plain string), `badge` (one
 * status badge), `badges` (a list of small badges), `date` (a locale
 * date), `relative` (a relative time), `count` (a right-aligned integer),
 * `size` (formatted bytes), `checksum` (the `ChecksumCell`, the one cell
 * that keeps an ellipsis), `link` (a link cell, the version and release
 * names and a search hit's title) and `word` (a closed-list word). A
 * priority of 1 never folds; a table short of room folds the highest
 * number first, and a column may name its own `priority` over the kind's.
 * Every `th` and `td` carries `.col-k-<kind>`, the class the stylesheet
 * styles a kind's cells by, never a column key.
 */
export const KINDS = {
  name: { priority: 1 },
  link: { priority: 1 },
  badge: { priority: 2 },
  count: { priority: 2 },
  size: { priority: 2 },
  date: { priority: 3 },
  relative: { priority: 3 },
  badges: { priority: 4 },
  text: { priority: 5 },
  word: { priority: 5 },
  checksum: { priority: 6 },
};

export const KIND_NAMES = Object.keys(KINDS);

/**
 * The kind class of a column kind, `col-k-<kind>`.
 *
 * @param {string} kind One of `KINDS`
 * @returns {string} The class the column's `th` and `td` carry
 */
export const kindClasses = kind => `col-k-${kind}`;

/**
 * The fold priority a column kind seeds, 1 never folding.
 *
 * @param {string} kind One of `KINDS`
 * @returns {number} The priority
 */
export const kindPriority = kind => KINDS[kind].priority;
