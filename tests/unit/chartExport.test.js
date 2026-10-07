import { describe, expect, it } from 'vitest';

import { csvOf, exportName } from '../../src/utils/chartExport.js';

const FIRST = Date.UTC(2026, 8, 27, 12, 0, 0);
const SECOND = FIRST + 5000;
const THIRD = FIRST + 10000;

const series = [
  {
    key: 'used',
    name: 'Used',
    points: [
      [FIRST, 6],
      [SECOND, 4],
      [THIRD, 5],
    ],
  },
  {
    key: 'cached',
    name: 'Cached, in GB',
    points: [
      [SECOND, null],
      [THIRD, 1],
    ],
  },
  { key: 'free', name: 'Free', points: [[FIRST, 2]], hidden: true },
];

describe('csvOf', () => {
  it('writes a header, one row an instant as RFC 3339 and one column a drawn line, CRLF ended', () => {
    expect(csvOf(series)).toBe(
      [
        'instant,Used,"Cached, in GB"',
        '2026-09-27T12:00:00.000Z,6,',
        '2026-09-27T12:00:05.000Z,4,',
        '2026-09-27T12:00:10.000Z,5,1',
        '',
      ].join('\r\n')
    );
  });

  it('keeps the rows inside the range alone', () => {
    expect(csvOf(series, { from: SECOND, to: THIRD })).toBe(
      [
        'instant,Used,"Cached, in GB"',
        '2026-09-27T12:00:05.000Z,4,',
        '2026-09-27T12:00:10.000Z,5,1',
        '',
      ].join('\r\n')
    );
  });

  it('quotes a field that holds a quote or a line break and doubles the quote', () => {
    const text = csvOf([{ key: 'a', name: 'Say "hi"\nnow', points: [[FIRST, 1]] }]);
    expect(text.split('\r\n')[0]).toBe('instant,"Say ""hi""\nnow"');
  });

  it('answers the header alone for lines without a point', () => {
    expect(csvOf([{ key: 'a', name: 'A', points: [] }])).toBe('instant,A\r\n');
  });
});

describe('exportName', () => {
  it('lowers the title, dashes the rest and adds the extension', () => {
    expect(exportName('CPU · hv-01', 'csv')).toBe('cpu-hv-01.csv');
    expect(exportName('  ', 'png')).toBe('chart.png');
  });
});
