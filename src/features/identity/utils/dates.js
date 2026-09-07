const DAY_MS = 24 * 60 * 60 * 1000;

const pad = value => String(value).padStart(2, '0');

/**
 * One absolute date format for every admin table, `YYYY-MM-DD HH:mm` in
 * the viewer's zone; empty for a value Date cannot parse.
 *
 * @param {string|number|Date} value - Anything Date can parse
 * @returns {string} The formatted time
 */
export const formatAbsolute = value => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

/**
 * A calendar date as `YYYY-MM-DD`, the value a date input takes.
 *
 * @param {Date} date - The date
 * @returns {string} The ISO calendar date
 */
export const isoDate = date =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * The calendar date a number of days before today.
 *
 * @param {number} days - How many days back
 * @returns {string} The ISO calendar date
 */
export const daysAgo = days => isoDate(new Date(Date.now() - days * DAY_MS));
