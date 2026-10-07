import { describe, expect, it } from 'vitest';

import { kindPriority } from '../../src/components/common/columnKinds.js';
import { cellClass } from '../../src/components/common/SubTable.jsx';

const column = { key: 'checksum', kind: 'checksum' };

describe('cellClass', () => {
  it('names the column and its kind', () => {
    expect(cellClass(column, false)).toBe('col-checksum col-k-checksum');
  });

  it('adds col-sized while the column carries a width', () => {
    expect(cellClass(column, false, true)).toBe('col-checksum col-k-checksum col-sized');
  });

  it('names the spark kind of a sparkline column', () => {
    expect(cellClass({ key: 'trend', kind: 'spark' }, false)).toBe('col-trend col-k-spark');
    expect(kindPriority('spark')).toBe(4);
  });

  it("adds folded last and keeps the column's own class", () => {
    expect(cellClass({ ...column, className: 'text-end' }, true, true)).toBe(
      'col-checksum col-k-checksum text-end col-sized folded'
    );
  });
});
