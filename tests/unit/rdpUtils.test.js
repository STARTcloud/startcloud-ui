import { describe, expect, it } from 'vitest';

import { rdpKeyEvents } from '../../src/features/hosts/utils/rdpUtils.js';

describe('rdpKeyEvents', () => {
  it('presses one key down and up per character on its physical key', () => {
    expect(rdpKeyEvents('a1 ')).toEqual([
      { type: 'keydown', code: 'KeyA', key: 'a' },
      { type: 'keyup', code: 'KeyA', key: 'a' },
      { type: 'keydown', code: 'Digit1', key: '1' },
      { type: 'keyup', code: 'Digit1', key: '1' },
      { type: 'keydown', code: 'Space', key: ' ' },
      { type: 'keyup', code: 'Space', key: ' ' },
    ]);
  });

  it('holds Shift around a capital and a shifted symbol', () => {
    expect(rdpKeyEvents('A!')).toEqual([
      { type: 'keydown', code: 'ShiftLeft', key: 'Shift' },
      { type: 'keydown', code: 'KeyA', key: 'A' },
      { type: 'keyup', code: 'KeyA', key: 'A' },
      { type: 'keyup', code: 'ShiftLeft', key: 'Shift' },
      { type: 'keydown', code: 'ShiftLeft', key: 'Shift' },
      { type: 'keydown', code: 'Digit1', key: '!' },
      { type: 'keyup', code: 'Digit1', key: '!' },
      { type: 'keyup', code: 'ShiftLeft', key: 'Shift' },
    ]);
  });

  it('types Enter for a line break and nothing for a character on no key', () => {
    expect(rdpKeyEvents('\n')).toEqual([
      { type: 'keydown', code: 'Enter', key: 'Enter' },
      { type: 'keyup', code: 'Enter', key: 'Enter' },
    ]);
    expect(rdpKeyEvents('\r')).toEqual([
      { type: 'keydown', code: 'Enter', key: 'Enter' },
      { type: 'keyup', code: 'Enter', key: 'Enter' },
    ]);
    expect(rdpKeyEvents('é')).toEqual([]);
    expect(rdpKeyEvents('')).toEqual([]);
  });
});
