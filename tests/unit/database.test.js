import { describe, expect, it } from 'vitest';

import {
  MAINTENANCE_ACTIONS,
  PAGE_SIZE,
  countOf,
  databaseFiles,
  databaseRows,
  databaseSize,
  fileName,
  formatDatabaseBytes,
  matchesDatabase,
  matchesDatabaseTable,
  orderOf,
  pageRange,
  reclaimedText,
} from '../../src/features/hosts/utils/database.js';

describe('the sizes and the counts', () => {
  it('formats bytes as the panel drew them', () => {
    expect(formatDatabaseBytes(2 * 1024 ** 3)).toBe('2.00 GB');
    expect(formatDatabaseBytes(1.5 * 1024 ** 2)).toBe('1.5 MB');
    expect(formatDatabaseBytes(2048)).toBe('2 KB');
    expect(formatDatabaseBytes(12)).toBe('12 B');
    expect(formatDatabaseBytes('x')).toBe('—');
  });

  it('counts a number or a list', () => {
    expect(countOf(3)).toBe(3);
    expect(countOf(['a', 'b'])).toBe(2);
    expect(countOf(null)).toBeNull();
  });

  it('reads the files, the size and the name of a file', () => {
    const database = {
      files: [
        { name: 'a.db', size: 100 },
        { filename: 'a.db-wal', size: 'x' },
      ],
    };
    expect(databaseFiles(database)).toHaveLength(2);
    expect(databaseFiles({})).toEqual([]);
    expect(databaseSize(database)).toBe(100);
    expect(databaseSize({ size: 5, files: [] })).toBe(5);
    expect(databaseSize({})).toBeNull();
    expect(fileName({ name: 'a' })).toBe('a');
    expect(fileName({ filename: 'b' })).toBe('b');
    expect(fileName({ path: '/c' })).toBe('/c');
    expect(fileName({})).toBe('');
    expect(databaseRows({ databases: [{ name: 'x' }] })).toHaveLength(1);
    expect(databaseRows(null)).toEqual([]);
  });
});

describe('the rows browser', () => {
  it('orders and ranges a page', () => {
    expect(orderOf('', true)).toBe('');
    expect(orderOf('id', false)).toBe('id');
    expect(orderOf('id', true)).toBe('id:desc');
    expect(pageRange(0, 0)).toEqual({ from: 0, to: 0 });
    expect(pageRange(0, 120)).toEqual({ from: 1, to: PAGE_SIZE });
    expect(pageRange(100, 120)).toEqual({ from: 101, to: 120 });
  });

  it('words the reclaimed space and lists the actions', () => {
    expect(
      reclaimedText([
        { name: 'monitoring', space_reclaimed: 4 * 1024 ** 2 },
        { name: 'tasks', space_reclaimed: 2048 },
      ])
    ).toBe('monitoring: 4.0 MB, tasks: 2 KB');
    expect(MAINTENANCE_ACTIONS).toEqual(['vacuum', 'analyze', 'cleanup']);
  });

  it('matches a database by its name and its files, a table by its name', () => {
    const database = { name: 'monitoring', files: [{ name: 'monitoring.db-wal' }] };
    expect(matchesDatabase(database, 'wal')).toBe(true);
    expect(matchesDatabase(database, 'tasks')).toBe(false);
    expect(matchesDatabaseTable({ name: 'cpu_stats' }, 'cpu')).toBe(true);
    expect(matchesDatabaseTable({ name: 'cpu_stats' }, 'mem')).toBe(false);
  });
});
