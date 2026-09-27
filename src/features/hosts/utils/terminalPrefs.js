const STORAGE_KEY = 'terminal_prefs';

export const TERMINAL_PREF_DEFAULTS = {
  fontSize: 12,
  fontFamily: '"Cascadia Code", Consolas, "Liberation Mono", Menlo, Courier, monospace',
  scrollback: 10000,
  cursorStyle: 'block',
  cursorBlink: true,
};

export const TERMINAL_FONT_SUGGESTIONS = [
  TERMINAL_PREF_DEFAULTS.fontFamily,
  '"Fira Code", monospace',
  '"JetBrains Mono", monospace',
  'Consolas, monospace',
  'Menlo, monospace',
  '"Courier New", monospace',
  'monospace',
];

export const FONT_SIZE_BOUNDS = { min: 6, max: 32 };

export const SCROLLBACK_BOUNDS = { min: 0, max: 200000 };

const CURSOR_STYLES = ['block', 'underline', 'bar'];

const listeners = new Set();

const within = (value, { min, max }) => Math.min(max, Math.max(min, value));

/**
 * The terminal preferences held to their bounds: the font size between 6
 * and 32, 12 for a value that is no number, the scrollback between 0 and
 * 200000, the cursor style one of block, underline and bar, the cursor
 * blink a boolean and the font family trimmed, the default one while it
 * is empty.
 *
 * @param {Object} prefs - The preferences as the dialog holds them
 * @returns {Object} `{ fontSize, fontFamily, scrollback, cursorStyle, cursorBlink }`
 */
export const boundPrefs = prefs => ({
  fontSize: within(Number(prefs.fontSize) || TERMINAL_PREF_DEFAULTS.fontSize, FONT_SIZE_BOUNDS),
  fontFamily: String(prefs.fontFamily || '').trim() || TERMINAL_PREF_DEFAULTS.fontFamily,
  scrollback: within(Number(prefs.scrollback) || 0, SCROLLBACK_BOUNDS),
  cursorStyle: CURSOR_STYLES.includes(prefs.cursorStyle)
    ? prefs.cursorStyle
    : TERMINAL_PREF_DEFAULTS.cursorStyle,
  cursorBlink: prefs.cursorBlink === true,
});

/**
 * The person's terminal preferences, the one object under
 * `terminal_prefs` over the defaults, the defaults alone while nothing
 * is stored or the stored value cannot be read.
 *
 * @returns {Object} The preferences
 */
export const loadTerminalPrefs = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...TERMINAL_PREF_DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) };
  } catch {
    return { ...TERMINAL_PREF_DEFAULTS };
  }
};

const announce = () => listeners.forEach(listener => listener());

/**
 * Store the preferences, held to their bounds, under `terminal_prefs`
 * and tell every open terminal, so a save applies at once.
 *
 * @param {Object} prefs - The preferences as the dialog holds them
 * @returns {Object} The preferences stored
 */
export const saveTerminalPrefs = prefs => {
  const clean = boundPrefs({ ...TERMINAL_PREF_DEFAULTS, ...prefs });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  announce();
  return clean;
};

/**
 * Drop the stored preferences and tell every open terminal, the
 * defaults standing again.
 *
 * @returns {Object} The defaults
 */
export const resetTerminalPrefs = () => {
  localStorage.removeItem(STORAGE_KEY);
  announce();
  return { ...TERMINAL_PREF_DEFAULTS };
};

/**
 * Hear every save and reset of the preferences for as long as the
 * answered function has not been called.
 *
 * @param {Function} listener - Called after every save and reset
 * @returns {Function} Stops listening
 */
export const onTerminalPrefs = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
