import { describe, expect, it } from 'vitest';

import { parseAnsi, stripAnsi } from '../../src/features/hosts/utils/ansi.js';

const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);

describe('parseAnsi', () => {
  it('answers one unpainted run for a plain line', () => {
    expect(parseAnsi('TASK [wait for ssh]')).toEqual([
      { text: 'TASK [wait for ssh]', className: '' },
    ]);
  });

  it('paints a colored line with the class of its SGR code', () => {
    expect(parseAnsi(`${ESC}[0;32mok: [localhost]${ESC}[0m`)).toEqual([
      { text: 'ok: [localhost]', className: 'ansi-32' },
    ]);
  });

  it('keeps the bold and the color until each is reset', () => {
    expect(parseAnsi(`${ESC}[1;31mfatal${ESC}[22m: ${ESC}[39mdone`)).toEqual([
      { text: 'fatal', className: 'ansi-31 ansi-bold' },
      { text: ': ', className: 'ansi-31' },
      { text: 'done', className: '' },
    ]);
  });

  it('drops the escape sequences that paint nothing', () => {
    expect(parseAnsi(`${ESC}[2K${ESC}]0;title${BEL}${ESC}[93mchanged`)).toEqual([
      { text: 'changed', className: 'ansi-93' },
    ]);
  });

  it('answers no run for an empty entry', () => {
    expect(parseAnsi('')).toEqual([]);
    expect(parseAnsi(null)).toEqual([]);
  });
});

describe('stripAnsi', () => {
  it('answers the plain text of an entry', () => {
    expect(stripAnsi(`${ESC}[0;32mok: [localhost]${ESC}[0m`)).toBe('ok: [localhost]');
    expect(stripAnsi('plain')).toBe('plain');
    expect(stripAnsi(undefined)).toBe('');
  });
});
