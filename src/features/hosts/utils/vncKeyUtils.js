import { log } from '../../../lib/logger';

/**
 * The X11 keysyms of the keys the VNC keyboard menu sends: the function
 * keys, the modifiers, tab, return, escape and delete, the lower-case
 * letters and the digits.
 */
export const keysymMap = {
  f1: 0xffbe,
  f2: 0xffbf,
  f3: 0xffc0,
  f4: 0xffc1,
  f5: 0xffc2,
  f6: 0xffc3,
  f7: 0xffc4,
  f8: 0xffc5,
  f9: 0xffc6,
  f10: 0xffc7,
  f11: 0xffc8,
  f12: 0xffc9,
  ctrl: 0xffe3,
  alt: 0xffe9,
  shift: 0xffe1,
  tab: 0xff09,
  return: 0xff0d,
  escape: 0xff1b,
  delete: 0xffff,
  a: 0x061,
  b: 0x062,
  c: 0x063,
  d: 0x064,
  e: 0x065,
  f: 0x066,
  g: 0x067,
  h: 0x068,
  i: 0x069,
  j: 0x06a,
  k: 0x06b,
  l: 0x06c,
  m: 0x06d,
  n: 0x06e,
  o: 0x06f,
  p: 0x070,
  q: 0x071,
  r: 0x072,
  s: 0x073,
  t: 0x074,
  u: 0x075,
  v: 0x076,
  w: 0x077,
  x: 0x078,
  y: 0x079,
  z: 0x07a,
  0: 0x030,
  1: 0x031,
  2: 0x032,
  3: 0x033,
  4: 0x034,
  5: 0x035,
  6: 0x036,
  7: 0x037,
  8: 0x038,
  9: 0x039,
};

/**
 * The `KeyboardEvent.code` of a modifier, its left key.
 *
 * @param {string} modifier - `ctrl`, `alt` or `shift`
 * @returns {string} The code, e.g. `CtrlLeft`
 */
export const modifierCode = modifier =>
  `${modifier.charAt(0).toUpperCase()}${modifier.slice(1)}Left`;

/**
 * Send one key to the VNC server with modifiers held, through the
 * viewer's `sendKey(keysym, code, down)`: each modifier down in order,
 * the key pressed and released, each modifier up in reverse order.
 *
 * @param {{ sendKey: Function }} viewer - The VNC viewer's handle
 * @param {number} keysym - The key's X11 keysym
 * @param {string} keyCode - The key's `KeyboardEvent.code`
 * @param {Array<string>} modifiers - The modifiers held, of `ctrl`, `alt` and `shift`
 * @returns {boolean} True when the keys were sent
 */
export const sendKeyWithModifiers = (viewer, keysym, keyCode, modifiers) => {
  if (!viewer?.sendKey) {
    return false;
  }
  try {
    modifiers.forEach(modifier => {
      const modifierKeysym = keysymMap[modifier];
      if (modifierKeysym) {
        viewer.sendKey(modifierKeysym, modifierCode(modifier), true);
      }
    });
    viewer.sendKey(keysym, keyCode);
    [...modifiers].reverse().forEach(modifier => {
      const modifierKeysym = keysymMap[modifier];
      if (modifierKeysym) {
        viewer.sendKey(modifierKeysym, modifierCode(modifier), false);
      }
    });
    return true;
  } catch (error) {
    log.component.error('Error sending key with modifiers', { error: error.message });
    return false;
  }
};

/**
 * The words the keyboard menu names a key by with its modifiers held,
 * `ctrl-alt-f4` for F4 with Ctrl and Alt on, the key alone otherwise.
 *
 * @param {string} baseKey - The key's name
 * @param {{ ctrl: boolean, alt: boolean, shift: boolean }} modifierKeys - Which modifiers are on
 * @returns {string} The words
 */
export const keyString = (baseKey, modifierKeys) => {
  const held = ['ctrl', 'alt', 'shift'].filter(modifier => modifierKeys[modifier]);
  return held.length > 0 ? `${held.join('-')}-${baseKey.toLowerCase()}` : baseKey.toLowerCase();
};
