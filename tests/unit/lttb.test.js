import { describe, expect, it } from 'vitest';

import { lttb, thinned } from '../../src/utils/lttb.js';

const line = count => [...Array(count).keys()].map(index => [index * 1000, index % 5]);

describe('lttb', () => {
  it('answers the points unchanged while they fit the threshold or the threshold is under three', () => {
    const points = line(10);
    expect(lttb(points, 10)).toBe(points);
    expect(lttb(points, 50)).toBe(points);
    expect(lttb(points, 2)).toBe(points);
    expect(lttb([], 5)).toEqual([]);
  });

  it('keeps the threshold of points at most, the first and the last among them', () => {
    const points = line(1000);
    const kept = lttb(points, 100);
    expect(kept).toHaveLength(100);
    expect(kept[0]).toBe(points[0]);
    expect(kept.at(-1)).toBe(points.at(-1));
  });

  it('keeps every point it answers in order and from the line', () => {
    const points = line(333);
    const kept = lttb(points, 17);
    expect(kept).toHaveLength(17);
    kept.forEach(point => expect(points).toContain(point));
    kept.slice(1).forEach((point, index) => expect(point[0]).toBeGreaterThan(kept[index][0]));
  });

  it('keeps a spike the buckets around it would average away', () => {
    const points = line(500).map(([at]) => [at, 1]);
    points[250] = [250000, 100];
    expect(lttb(points, 20)).toContainEqual([250000, 100]);
  });
});

describe('thinned', () => {
  it('cuts the line at every null, thins each piece and joins them with one null at the hole', () => {
    const first = line(400);
    const second = line(400).map(([at, value]) => [at + 1000000, value]);
    const points = [...first, [700000, null], ...second];
    const drawn = thinned(points, 100);
    const nulls = drawn.filter(point => point[1] === null);
    expect(nulls).toHaveLength(1);
    expect(nulls[0][0]).toBe((first.at(-1)[0] + second[0][0]) / 2);
    expect(drawn.length).toBeLessThanOrEqual(101);
    expect(drawn[0]).toBe(first[0]);
    expect(drawn.at(-1)).toBe(second.at(-1));
  });

  it('keeps three points at least of every piece and drops a leading or trailing null', () => {
    const points = [
      [0, null],
      [1000, 1],
      [2000, 2],
      [3000, 3],
      [4000, 4],
      [5000, null],
    ];
    const drawn = thinned(points, 2);
    expect(drawn).toHaveLength(3);
    expect(drawn[0]).toEqual([1000, 1]);
    expect(drawn[2]).toEqual([4000, 4]);
    expect([2000, 3000]).toContain(drawn[1][0]);
    expect(thinned([[0, null]], 10)).toEqual([]);
    expect(thinned([], 10)).toEqual([]);
  });

  it('answers a short line as it is', () => {
    const points = [
      [1000, 1],
      [2000, null],
      [3000, 3],
    ];
    expect(thinned(points, 100)).toEqual([
      [1000, 1],
      [2000, null],
      [3000, 3],
    ]);
  });
});
