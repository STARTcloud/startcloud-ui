/**
 * The screen word of one value of a downloads closed list (`kind`,
 * `platform`, `architecture`, `language`), the value itself while no word
 * is named, so a language tag draws as it is.
 *
 * @param {Function} t - The translator
 * @param {string} group - `kind`, `platform`, `architecture` or `language`
 * @param {string} value - The stored value
 * @returns {string} The word to draw
 */
export const listWord = (t, group, value) =>
  value ? t(`downloads.${group}.${value}`, { defaultValue: value }) : '';
