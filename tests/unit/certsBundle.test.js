import { describe, expect, it } from 'vitest';

import {
  BUNDLE_EXTENSION,
  BUNDLE_VERSION,
  fromBundle,
  toBundle,
} from '../../src/features/certs/utils/bundle.js';

const cert = { id: 'rec-1', kind: 'certificate', name: 'Leaf' };
const key = { id: 'rec-2', kind: 'key', name: 'Key' };

describe('toBundle', () => {
  it('writes the version and the records as readable JSON', () => {
    const text = toBundle([cert, key]);
    expect(JSON.parse(text)).toEqual({ version: BUNDLE_VERSION, records: [cert, key] });
    expect(text).toContain('\n  "version": 1');
    expect(BUNDLE_VERSION).toBe(1);
    expect(BUNDLE_EXTENSION).toBe('.certs.json');
  });
});

describe('fromBundle', () => {
  it('answers the records of a bundle and reads its own output back', () => {
    expect(fromBundle(toBundle([cert, key]))).toEqual([cert, key]);
  });

  it('keeps every entry that is a record of a known kind and drops the rest', () => {
    const text = JSON.stringify({
      version: 1,
      records: [cert, { id: 3, kind: 'key' }, { id: 'x', kind: 'other' }, null, 'text', key],
    });
    expect(fromBundle(text)).toEqual([cert, key]);
  });

  it('answers null for text that is no bundle', () => {
    expect(fromBundle('not json')).toBeNull();
    expect(fromBundle('[]')).toBeNull();
    expect(fromBundle('null')).toBeNull();
    expect(fromBundle(JSON.stringify({ version: 2, records: [] }))).toBeNull();
    expect(fromBundle(JSON.stringify({ version: 1, records: 'none' }))).toBeNull();
    expect(fromBundle(JSON.stringify({ records: [cert] }))).toBeNull();
  });
});
