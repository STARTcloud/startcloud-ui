import PropTypes from 'prop-types';

const textOf = value => (typeof value === 'string' && value ? value : undefined);

export const clockShape = PropTypes.shape({
  timeZone: PropTypes.string,
  locale: PropTypes.string,
  hourCycle: PropTypes.string,
});

/**
 * The clock an account's preferences name: its `timezone`, `locale` and
 * `hour_cycle`, each `undefined` while the account holds none, so the
 * browser's own stands in.
 *
 * @param {Object|null|undefined} preferences - The record's `preferences`
 * @returns {{ timeZone?: string, locale?: string, hourCycle?: string }} The clock
 */
export const clockOf = preferences => ({
  timeZone: textOf(preferences?.timezone),
  locale: textOf(preferences?.locale),
  hourCycle: textOf(preferences?.hour_cycle),
});

const formatter = (clock, language, withZone) =>
  new Intl.DateTimeFormat(clock.locale || language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    hourCycle: clock.hourCycle,
    ...(withZone && clock.timeZone ? { timeZone: clock.timeZone } : {}),
  });

/**
 * One instant written on an account's clock: the date and the time in the
 * clock's locale, the UI's language while it names none, on its hour
 * cycle and in its time zone, the browser's own while it names none or
 * names one the browser does not know; empty for a value Date cannot
 * parse.
 *
 * @param {string|number|Date} value - Anything Date can parse
 * @param {{ timeZone?: string, locale?: string, hourCycle?: string }} clock - The clock from `clockOf`
 * @param {string} language - The language the UI is drawn in
 * @returns {string} The formatted instant
 */
export const formatInstant = (value, clock, language) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  try {
    return formatter(clock, language, true).format(date);
  } catch {
    try {
      return formatter(clock, language, false).format(date);
    } catch {
      return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(
        date
      );
    }
  }
};
