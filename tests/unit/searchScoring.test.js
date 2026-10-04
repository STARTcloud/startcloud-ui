import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { compareRowsFor, matchFields } from '../../src/utils/searchScore.js';

const { cases } = JSON.parse(
  fs.readFileSync(path.resolve('tests/fixtures/search/scoring.json'), 'utf8')
);

const ranked = ({ query, rows }) =>
  rows
    .flatMap(row => {
      const match = matchFields(row.fields, query);
      return match ? [{ id: row.id, title: row.title, score: match.score }] : [];
    })
    .sort(compareRowsFor(query))
    .map(({ id, score }) => ({ id, score }));

describe('the shared search scoring', () => {
  it.each(cases)('ranks the rows for "$query"', entry => {
    expect(ranked(entry)).toEqual(entry.expected);
  });
});
