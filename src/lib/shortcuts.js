export const EDITABLE = 'input,select,textarea,[contenteditable]';

export const CATEGORIES = ['jump', 'application', 'navigation', 'actions', 'search'];

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'OS']);

const LETTER = /^[a-z]$/iu;

const NAMED_KEYS = { ctrl: 'ctrl', alt: 'alt', shift: 'shift', enter: 'enter' };

/**
 * Whether a keydown's target is a place a person types, where no
 * shortcut fires: an input, a select, a textarea or an editable element,
 * inside a modal or outside one.
 *
 * @param {EventTarget|null} target - The event's target
 * @returns {boolean} True for an editable target
 */
export const isEditableTarget = target => Boolean(target?.closest?.(EDITABLE));

const ACTIVATION = 'a[href],button,[role="button"],[role="link"],[role="menuitem"],[role="option"]';

const ENTER_COMBOS = new Set(['enter', 'ctrl+enter']);

/**
 * Whether a keydown is Enter on a control Enter already activates, a link,
 * a button or a menu row, where the Enter shortcut yields to the control.
 *
 * @param {string} combo - The combo of `comboOf`
 * @param {EventTarget|null} target - The event's target
 * @returns {boolean} True when the control keeps its Enter
 */
export const isActivation = (combo, target) =>
  ENTER_COMBOS.has(combo) && Boolean(target?.closest?.(ACTIVATION));

/**
 * The combo one keydown names: the modifiers held then the key, joined
 * by `+`, `ctrl` standing for Control and Command alike, `shift` named
 * only before a letter or a named key because a symbol already says it
 * (`?`, `#`, `/`), a letter lowercased; empty for a modifier pressed
 * alone.
 *
 * @param {{ key: string, ctrlKey?: boolean, metaKey?: boolean, altKey?: boolean, shiftKey?: boolean }} event - The keydown
 * @returns {string} The combo, such as `g`, `shift+b`, `ctrl+alt+f`, `ctrl+/`, `?`
 */
export const comboOf = event => {
  const { key } = event;
  if (!key || MODIFIER_KEYS.has(key)) {
    return '';
  }
  const letter = LETTER.test(key);
  const named = key.length > 1;
  const parts = [];
  if (event.ctrlKey || event.metaKey) {
    parts.push('ctrl');
  }
  if (event.altKey) {
    parts.push('alt');
  }
  if (event.shiftKey && (letter || named)) {
    parts.push('shift');
  }
  parts.push(letter || named ? key.toLowerCase() : key);
  return parts.join('+');
};

const single = (row, combo) => row.keys.some(seq => seq.length === 1 && seq[0] === combo);

const chord = (row, first, second) =>
  row.keys.some(seq => seq.length === 2 && seq[0] === first && seq[1] === second);

const starts = (row, combo) => row.keys.some(seq => seq.length === 2 && seq[0] === combo);

/**
 * The next state of the matcher after one combo: with a chord pending,
 * the row the pair names and the pending cleared whatever the key, since
 * any other key cancels a chord; with none, the row the combo names
 * alone, else the combo held as pending while some row's chord begins
 * with it. A modifier pressed alone, an empty combo, changes nothing.
 *
 * @param {Array<{ keys: Array<Array<string>> }>} rows - The rows that may fire
 * @param {string} pending - The first combo of a chord, empty for none
 * @param {string} combo - The combo of `comboOf`
 * @returns {{ pending: string, hit: Object|null }} The pending combo and the row that fires
 */
export const resolve = (rows, pending, combo) => {
  if (!combo) {
    return { pending, hit: null };
  }
  if (pending) {
    return { pending: '', hit: rows.find(row => chord(row, pending, combo)) || null };
  }
  const hit = rows.find(row => single(row, combo)) || null;
  if (hit) {
    return { pending: '', hit };
  }
  return { pending: rows.some(row => starts(row, combo)) ? combo : '', hit: null };
};

/**
 * The words one combo is drawn as, one `<kbd>` each: the modifiers and
 * Enter by their names, a letter uppercased, a symbol as it is.
 *
 * @param {string} combo - The combo
 * @returns {Array<{ name: string, text: string }>} The parts, `name` the translation key's tail for a named part, empty for a plain key
 */
export const partsOf = combo =>
  combo.split('+').map(part => {
    if (NAMED_KEYS[part]) {
      return { name: part, text: '' };
    }
    return { name: '', text: part.length === 1 ? part.toUpperCase() : part };
  });

const keysText = row =>
  row.keys.map(seq => seq.map(combo => combo.replace(/\+/gu, ' ')).join(' ')).join(' ');

/**
 * The rows whose description or key combination carries the typed text,
 * every row while nothing is typed.
 *
 * @param {Array<Object>} rows - The rows
 * @param {string} text - The filter typed
 * @param {Function} labelOf - The description of one row
 * @returns {Array<Object>} The rows kept
 */
export const filterRows = (rows, text, labelOf) => {
  const needle = text.trim().toLowerCase();
  if (!needle) {
    return rows;
  }
  return rows.filter(
    row =>
      labelOf(row).toLowerCase().includes(needle) || keysText(row).toLowerCase().includes(needle)
  );
};

/**
 * The rows grouped by category in the categories' order, a category
 * with no row left out.
 *
 * @param {Array<Object>} rows - The rows
 * @returns {Array<{ category: string, rows: Array<Object> }>} The groups
 */
export const groupRows = rows =>
  CATEGORIES.map(category => ({
    category,
    rows: rows.filter(row => row.category === category),
  })).filter(group => group.rows.length > 0);
