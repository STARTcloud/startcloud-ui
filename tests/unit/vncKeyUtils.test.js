import { describe, expect, it, vi } from 'vitest';

import {
  keyString,
  keysymMap,
  modifierCode,
  sendKeyWithModifiers,
} from '../../src/features/hosts/utils/vncKeyUtils.js';

describe('keysymMap', () => {
  it('names the function keys, the modifiers and the common keys by their X11 keysyms', () => {
    expect(keysymMap.f1).toBe(0xffbe);
    expect(keysymMap.f12).toBe(0xffc9);
    expect(keysymMap.ctrl).toBe(0xffe3);
    expect(keysymMap.alt).toBe(0xffe9);
    expect(keysymMap.shift).toBe(0xffe1);
    expect(keysymMap.tab).toBe(0xff09);
    expect(keysymMap.a).toBe(0x61);
    expect(keysymMap[0]).toBe(0x30);
  });
});

describe('modifierCode', () => {
  it('answers the left key code of a modifier', () => {
    expect(modifierCode('ctrl')).toBe('CtrlLeft');
    expect(modifierCode('alt')).toBe('AltLeft');
    expect(modifierCode('shift')).toBe('ShiftLeft');
  });
});

describe('sendKeyWithModifiers', () => {
  it('holds the modifiers down in order, presses the key and lifts them in reverse', () => {
    const viewer = { sendKey: vi.fn() };
    expect(sendKeyWithModifiers(viewer, keysymMap.f4, 'F4', ['ctrl', 'alt'])).toBe(true);
    expect(viewer.sendKey.mock.calls).toEqual([
      [0xffe3, 'CtrlLeft', true],
      [0xffe9, 'AltLeft', true],
      [0xffc1, 'F4'],
      [0xffe9, 'AltLeft', false],
      [0xffe3, 'CtrlLeft', false],
    ]);
  });

  it('sends the key alone with no modifier held and answers false without a viewer', () => {
    const viewer = { sendKey: vi.fn() };
    expect(sendKeyWithModifiers(viewer, keysymMap.tab, 'Tab', [])).toBe(true);
    expect(viewer.sendKey.mock.calls).toEqual([[0xff09, 'Tab']]);
    expect(sendKeyWithModifiers(null, keysymMap.tab, 'Tab', [])).toBe(false);
    expect(sendKeyWithModifiers({}, keysymMap.tab, 'Tab', [])).toBe(false);
  });

  it('answers false when the viewer throws', () => {
    const viewer = {
      sendKey: () => {
        throw new Error('gone');
      },
    };
    expect(sendKeyWithModifiers(viewer, keysymMap.tab, 'Tab', ['shift'])).toBe(false);
  });
});

describe('keyString', () => {
  it('names the key with the modifiers held before it', () => {
    expect(keyString('F4', { ctrl: true, alt: true, shift: false })).toBe('ctrl-alt-f4');
    expect(keyString('F4', { ctrl: false, alt: false, shift: true })).toBe('shift-f4');
    expect(keyString('F4', { ctrl: false, alt: false, shift: false })).toBe('f4');
  });
});
