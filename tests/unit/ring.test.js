import { describe, expect, it } from 'vitest';

import { ringKey } from '../../src/features/hosts/utils/ring.js';

describe('ringKey', () => {
  it("joins the host and the series, and a machine's name between them", () => {
    expect(ringKey('3', 'cpu')).toBe('3|cpu');
    expect(ringKey('self', 'web-1', 'link:vnic0')).toBe('self|web-1|link:vnic0');
  });
});
