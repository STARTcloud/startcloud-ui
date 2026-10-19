const MIDDLE_MAX = 48;

/**
 * A text cut in its middle to at most `max` characters, its first and its
 * last parts joined by one "…"; a text that fits is answered whole.
 *
 * @param {string} text - The text
 * @param {number} [max] - The longest the answer may be, 48 by default
 * @returns {string} The text, whole or cut
 */
export const middleEllipsis = (text, max = MIDDLE_MAX) => {
  const whole = String(text ?? '');
  if (whole.length <= max) {
    return whole;
  }
  const kept = Math.max(max - 1, 0);
  const head = Math.ceil(kept / 2);
  const tail = kept - head;
  return `${whole.slice(0, head)}…${whole.slice(whole.length - tail)}`;
};
