/**
 * The screen word of one value of a downloads closed list (`kind`,
 * `platform`, `architecture`), the value itself while no word is named.
 *
 * @param {Function} t - The translator
 * @param {string} group - `kind`, `platform` or `architecture`
 * @param {string} value - The stored value
 * @returns {string} The word to draw
 */
export const listWord = (t, group, value) =>
  value ? t(`downloads.${group}.${value}`, { defaultValue: value }) : '';
