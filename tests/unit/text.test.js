import { describe, expect, it } from 'vitest';

import { middleEllipsis } from '../../src/utils/text.js';

const PATH = '/var/lib/hyperweaver/machines/build-win11/build-win11.vdi';

describe('middleEllipsis', () => {
  it('answers a text that fits whole', () => {
    expect(middleEllipsis('/var/lib/disk.vdi')).toBe('/var/lib/disk.vdi');
    expect(middleEllipsis('abcdef', 6)).toBe('abcdef');
    expect(middleEllipsis('')).toBe('');
    expect(middleEllipsis(null)).toBe('');
  });

  it('keeps the first and the last parts joined by one ellipsis, 48 characters by default', () => {
    const cut = middleEllipsis(PATH);
    expect(cut).toHaveLength(48);
    expect(cut).toBe('/var/lib/hyperweaver/mac…d-win11/build-win11.vdi');
    expect(cut.split('…')).toHaveLength(2);
  });

  it('cuts to the length asked', () => {
    expect(middleEllipsis('abcdefghij', 5)).toBe('ab…ij');
    expect(middleEllipsis('abcdefghij', 6)).toBe('abc…ij');
    expect(middleEllipsis('abcdefghij', 1)).toBe('…');
  });
});
