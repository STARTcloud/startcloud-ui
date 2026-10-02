import { log } from '../../../lib/logger';

const SHIFT_KEYSYM = 0xffe1;

const SYMBOL_KEYSYMS = {
  ' ': 0x20,
  '!': 0x21,
  '"': 0x22,
  '#': 0x23,
  $: 0x24,
  '%': 0x25,
  '&': 0x26,
  "'": 0x27,
  '(': 0x28,
  ')': 0x29,
  '*': 0x2a,
  '+': 0x2b,
  ',': 0x2c,
  '-': 0x2d,
  '.': 0x2e,
  '/': 0x2f,
  ':': 0x3a,
  ';': 0x3b,
  '<': 0x3c,
  '=': 0x3d,
  '>': 0x3e,
  '?': 0x3f,
  '@': 0x40,
  '[': 0x5b,
  '\\': 0x5c,
  ']': 0x5d,
  '^': 0x5e,
  _: 0x5f,
  '`': 0x60,
  '{': 0x7b,
  '|': 0x7c,
  '}': 0x7d,
  '~': 0x7e,
  '\n': 0xff0d,
  '\r': 0xff0d,
  '\t': 0xff09,
};

const SYMBOL_KEYCODES = {
  ' ': 'Space',
  '\n': 'Enter',
  '\r': 'Enter',
  '\t': 'Tab',
  '!': 'Digit1',
  '@': 'Digit2',
  '#': 'Digit3',
  $: 'Digit4',
  '%': 'Digit5',
  '^': 'Digit6',
  '&': 'Digit7',
  '*': 'Digit8',
  '(': 'Digit9',
  ')': 'Digit0',
  '-': 'Minus',
  _: 'Minus',
  '=': 'Equal',
  '+': 'Equal',
  '[': 'BracketLeft',
  '{': 'BracketLeft',
  ']': 'BracketRight',
  '}': 'BracketRight',
  '\\': 'Backslash',
  '|': 'Backslash',
  ';': 'Semicolon',
  ':': 'Semicolon',
  "'": 'Quote',
  '"': 'Quote',
  '`': 'Backquote',
  '~': 'Backquote',
  ',': 'Comma',
  '<': 'Comma',
  '.': 'Period',
  '>': 'Period',
  '/': 'Slash',
  '?': 'Slash',
};

const SHIFTED = '!@#$%^&*()_+{}|:"<>?~';

/**
 * The X11 keysym of one typed character: the letters and the digits
 * their ASCII, the symbols and the line breaks their own keysyms, and
 * any other character its code point.
 *
 * @param {string} char - One character
 * @returns {number} The keysym
 */
export const getKeysymForChar = char => {
  const code = char.charCodeAt(0);
  if (char >= 'a' && char <= 'z') {
    return 0x61 + (code - 97);
  }
  if (char >= 'A' && char <= 'Z') {
    return 0x41 + (code - 65);
  }
  if (char >= '0' && char <= '9') {
    return 0x30 + (code - 48);
  }
  return SYMBOL_KEYSYMS[char] || code;
};

/**
 * The `KeyboardEvent.code` of one typed character, the physical key it
 * sits on, `KeyA` for `a` and `A`, `Digit1` for `1` and `!`; null for a
 * character on no key of the map.
 *
 * @param {string} char - One character
 * @returns {string|null} The code
 */
export const getKeyCodeForChar = char => {
  if (char >= 'a' && char <= 'z') {
    return `Key${char.toUpperCase()}`;
  }
  if (char >= 'A' && char <= 'Z') {
    return `Key${char}`;
  }
  if (char >= '0' && char <= '9') {
    return `Digit${char}`;
  }
  return SYMBOL_KEYCODES[char] || null;
};

/**
 * Whether typing one character needs Shift held, a capital or a shifted
 * symbol.
 *
 * @param {string} char - One character
 * @returns {boolean} True when Shift is needed
 */
export const needsShiftKey = char => (char >= 'A' && char <= 'Z') || SHIFTED.includes(char);

/**
 * The tone of the VNC status dot: success while connected, warning while
 * connecting and danger otherwise.
 *
 * @param {boolean} connected - Whether the viewer is connected
 * @param {boolean} connecting - Whether it is connecting
 * @returns {string} The Bootstrap text class
 */
export const getStatusColorClass = (connected, connecting) => {
  if (connected) {
    return 'text-success';
  }
  if (connecting) {
    return 'text-warning';
  }
  return 'text-danger';
};

const typeChar = (viewer, char) => {
  const keysym = getKeysymForChar(char);
  const keyCode = getKeyCodeForChar(char);
  if (needsShiftKey(char) && keyCode) {
    viewer.sendKey(SHIFT_KEYSYM, 'ShiftLeft', true);
    viewer.sendKey(keysym, keyCode);
    viewer.sendKey(SHIFT_KEYSYM, 'ShiftLeft', false);
  } else if (keyCode) {
    viewer.sendKey(keysym, keyCode);
  } else {
    viewer.sendKey(keysym, null);
  }
};

/**
 * Type text into the VNC session, one key event per character, Shift
 * held around each capital and shifted symbol; the way a paste reaches
 * a guest that has no clipboard. Nothing is sent while the viewer is not
 * connected.
 *
 * @param {{ current: { sendKey: Function }|null }} vncRef - The viewer's ref
 * @param {boolean} connected - Whether the viewer is connected
 * @param {string} text - The text to type
 * @returns {boolean} True when the text was sent
 */
export const performTyping = (vncRef, connected, text) => {
  if (!vncRef.current || !connected) {
    return false;
  }
  try {
    [...text].forEach(char => typeChar(vncRef.current, char));
    return true;
  } catch (error) {
    log.component.error('Error typing into the VNC session', { error: error.message });
    return false;
  }
};

/**
 * Send one key event to the VNC session through the viewer.
 *
 * @param {{ current: { sendKey: Function }|null }} vncRef - The viewer's ref
 * @param {boolean} connected - Whether the viewer is connected
 * @param {number} keysym - The key's X11 keysym
 * @param {string|null} code - The key's `KeyboardEvent.code`
 * @param {boolean} [down] - Down or up; both when left out
 * @returns {boolean} True when the key was sent
 */
export const performSendKey = (vncRef, connected, keysym, code, down) => {
  if (!vncRef.current || !connected) {
    return false;
  }
  try {
    vncRef.current.sendKey(keysym, code, down);
    return true;
  } catch (error) {
    log.component.error('Error sending a VNC key', { error: error.message });
    return false;
  }
};

/**
 * Send Ctrl+Alt+Del to the VNC session through the viewer.
 *
 * @param {{ current: { sendCtrlAltDel: Function }|null }} vncRef - The viewer's ref
 * @param {boolean} connected - Whether the viewer is connected
 * @returns {boolean} True when it was sent
 */
export const performCtrlAltDel = (vncRef, connected) => {
  if (!vncRef.current || !connected) {
    return false;
  }
  try {
    vncRef.current.sendCtrlAltDel();
    return true;
  } catch (error) {
    log.component.error('Error sending Ctrl+Alt+Del', { error: error.message });
    return false;
  }
};
