import { log } from '../../../lib/logger';

import { getKeyCodeForChar, needsShiftKey } from './vncUtils';

const SHIFT = { code: 'ShiftLeft', key: 'Shift' };

const ENTER = { code: 'Enter', key: 'Enter' };

const keyOf = char => {
  if (char === '\n' || char === '\r') {
    return ENTER;
  }
  const code = getKeyCodeForChar(char);
  return code ? { code, key: char } : null;
};

const press = key => [
  { type: 'keydown', ...key },
  { type: 'keyup', ...key },
];

/**
 * The keyboard events that type one string into the browser-RDP client:
 * one key down and up per character on the physical key `getKeyCodeForChar`
 * names, Shift held around a capital or a shifted symbol, Enter for a
 * line break, and nothing for a character on no key of the map, because
 * the client turns a key's `code` into the scancode the remote display
 * takes.
 *
 * @param {string} text - The string to type
 * @returns {Array<{ type: string, code: string, key: string }>} The events in order
 */
export const rdpKeyEvents = text =>
  [...text].flatMap(char => {
    const key = keyOf(char);
    if (!key) {
      return [];
    }
    if (needsShiftKey(char)) {
      return [{ type: 'keydown', ...SHIFT }, ...press(key), { type: 'keyup', ...SHIFT }];
    }
    return press(key);
  });

/**
 * Type a string into one browser-RDP client element: the element is
 * focused, since the client forwards the window's key events to the
 * session only while its element is the document's active element, the
 * events of `rdpKeyEvents` are dispatched on the window, and the focus
 * goes back where it was. Nothing is typed while no element is given.
 *
 * @param {HTMLElement|null} element - The `iron-remote-desktop` element
 * @param {string} text - The string to type
 * @returns {boolean} True when the events were dispatched
 */
export const performRdpTyping = (element, text) => {
  if (!element) {
    return false;
  }
  const focused = document.activeElement;
  try {
    element.focus();
    rdpKeyEvents(text).forEach(event => {
      window.dispatchEvent(
        new KeyboardEvent(event.type, {
          code: event.code,
          key: event.key,
          bubbles: true,
          cancelable: true,
        })
      );
    });
    return true;
  } catch (error) {
    log.component.error('Error typing into the RDP session', { error: error.message });
    return false;
  } finally {
    if (focused && focused !== element && typeof focused.focus === 'function') {
      focused.focus();
    }
  }
};
