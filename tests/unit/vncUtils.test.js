import { describe, expect, it, vi } from 'vitest';

import {
  getKeyCodeForChar,
  getKeysymForChar,
  getStatusColorClass,
  needsShiftKey,
  performCtrlAltDel,
  performSendKey,
  performTyping,
} from '../../src/features/hosts/utils/vncUtils.js';

describe('getKeysymForChar', () => {
  it('answers the ASCII keysym of letters and digits and the map of symbols', () => {
    expect(getKeysymForChar('a')).toBe(0x61);
    expect(getKeysymForChar('Z')).toBe(0x5a);
    expect(getKeysymForChar('7')).toBe(0x37);
    expect(getKeysymForChar('!')).toBe(0x21);
    expect(getKeysymForChar('\n')).toBe(0xff0d);
    expect(getKeysymForChar('\t')).toBe(0xff09);
    expect(getKeysymForChar('é')).toBe('é'.charCodeAt(0));
  });
});

describe('getKeyCodeForChar', () => {
  it('answers the physical key of letters, digits and symbols and null for the rest', () => {
    expect(getKeyCodeForChar('a')).toBe('KeyA');
    expect(getKeyCodeForChar('Q')).toBe('KeyQ');
    expect(getKeyCodeForChar('3')).toBe('Digit3');
    expect(getKeyCodeForChar('!')).toBe('Digit1');
    expect(getKeyCodeForChar('_')).toBe('Minus');
    expect(getKeyCodeForChar(' ')).toBe('Space');
    expect(getKeyCodeForChar('é')).toBeNull();
  });
});

describe('needsShiftKey', () => {
  it('holds Shift for capitals and shifted symbols alone', () => {
    expect(needsShiftKey('A')).toBe(true);
    expect(needsShiftKey('!')).toBe(true);
    expect(needsShiftKey('~')).toBe(true);
    expect(needsShiftKey('a')).toBe(false);
    expect(needsShiftKey('1')).toBe(false);
    expect(needsShiftKey('-')).toBe(false);
  });
});

describe('getStatusColorClass', () => {
  it('answers success, warning and danger', () => {
    expect(getStatusColorClass(true, false)).toBe('text-success');
    expect(getStatusColorClass(false, true)).toBe('text-warning');
    expect(getStatusColorClass(false, false)).toBe('text-danger');
  });
});

describe('performTyping', () => {
  it('types each character, Shift held around a capital, and answers true', () => {
    const viewer = { sendKey: vi.fn() };
    expect(performTyping({ current: viewer }, true, 'aB')).toBe(true);
    expect(viewer.sendKey.mock.calls).toEqual([
      [0x61, 'KeyA'],
      [0xffe1, 'ShiftLeft', true],
      [0x42, 'KeyB'],
      [0xffe1, 'ShiftLeft', false],
    ]);
  });

  it('sends the keysym alone for a character on no key and nothing while not connected', () => {
    const viewer = { sendKey: vi.fn() };
    expect(performTyping({ current: viewer }, true, 'é')).toBe(true);
    expect(viewer.sendKey.mock.calls).toEqual([['é'.charCodeAt(0), null]]);
    expect(performTyping({ current: viewer }, false, 'a')).toBe(false);
    expect(performTyping({ current: null }, true, 'a')).toBe(false);
  });
});

describe('performSendKey and performCtrlAltDel', () => {
  it('forward to the viewer while connected and answer false otherwise', () => {
    const viewer = { sendKey: vi.fn(), sendCtrlAltDel: vi.fn() };
    expect(performSendKey({ current: viewer }, true, 0xff09, 'Tab', true)).toBe(true);
    expect(viewer.sendKey).toHaveBeenCalledWith(0xff09, 'Tab', true);
    expect(performSendKey({ current: viewer }, false, 0xff09, 'Tab', true)).toBe(false);
    expect(performCtrlAltDel({ current: viewer }, true)).toBe(true);
    expect(viewer.sendCtrlAltDel).toHaveBeenCalledTimes(1);
    expect(performCtrlAltDel({ current: null }, true)).toBe(false);
  });

  it('answers false when the viewer throws', () => {
    const viewer = {
      sendKey: () => {
        throw new Error('gone');
      },
      sendCtrlAltDel: () => {
        throw new Error('gone');
      },
    };
    expect(performSendKey({ current: viewer }, true, 0xff09, 'Tab')).toBe(false);
    expect(performCtrlAltDel({ current: viewer }, true)).toBe(false);
  });
});
