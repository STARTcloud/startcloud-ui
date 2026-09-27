const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);

const NON_SGR_ESCAPES = new RegExp(
  `${ESC}(?:\\[(?![0-9;]*m)[0-9;?]*[A-Za-z]|\\][^${BEL}${ESC}]*(?:${BEL}|${ESC}\\\\)?)`,
  'g'
);

const SGR_SPLIT = new RegExp(`${ESC}\\[(?<codes>[0-9;]*)m`);

const ALL_SGR = new RegExp(`${ESC}\\[[0-9;]*m`, 'g');

const COLOR_CODES = [30, 31, 32, 33, 34, 35, 36, 37, 90, 91, 92, 93, 94, 95, 96, 97];

const RESET = 0;
const BOLD = 1;
const BOLD_OFF = 22;
const COLOR_OFF = 39;

const applyCode = (paint, code) => {
  if (code === RESET) {
    return { color: 0, bold: false };
  }
  if (code === BOLD) {
    return { ...paint, bold: true };
  }
  if (code === BOLD_OFF) {
    return { ...paint, bold: false };
  }
  if (code === COLOR_OFF) {
    return { ...paint, color: 0 };
  }
  return COLOR_CODES.includes(code) ? { ...paint, color: code } : paint;
};

const codesOf = part => (part === '' ? ['0'] : part.split(';')).map(Number);

const classOf = paint =>
  [paint.color ? `ansi-${paint.color}` : '', paint.bold ? 'ansi-bold' : '']
    .filter(Boolean)
    .join(' ');

/**
 * The plain text of a task's output entry, every escape sequence taken
 * out, the form Copy puts on the clipboard.
 *
 * @param {*} data - The entry's `data`
 * @returns {string} The text
 */
export const stripAnsi = data =>
  String(data ?? '')
    .replace(NON_SGR_ESCAPES, '')
    .replace(ALL_SGR, '');

/**
 * A task's output entry parsed into painted runs: the SGR color codes 30
 * to 37 and 90 to 97 as the class `ansi-<code>`, bold as `ansi-bold`, 0
 * resetting both, 22 the bold and 39 the color, every other escape
 * sequence dropped; the classes are the stylesheet's, so no run carries a
 * style of its own.
 *
 * @param {*} data - The entry's `data`
 * @returns {Array<{ text: string, className: string }>} The runs, none for an empty entry
 */
export const parseAnsi = data => {
  const parts = String(data ?? '')
    .replace(NON_SGR_ESCAPES, '')
    .split(SGR_SPLIT);
  const runs = [];
  let paint = { color: 0, bold: false };
  parts.forEach((part, position) => {
    if (position % 2 === 1) {
      paint = codesOf(part).reduce(applyCode, paint);
      return;
    }
    if (part !== '') {
      runs.push({ text: part, className: classOf(paint) });
    }
  });
  return runs;
};
