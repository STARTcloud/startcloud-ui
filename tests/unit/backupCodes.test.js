import { describe, expect, it } from 'vitest';

import { backupCodesFileName } from '../../src/utils/backupCodes';

describe('backupCodesFileName', () => {
  const day = new Date('2026-11-15T03:04:05Z');

  it('joins the site, the email and the day with hyphens', () => {
    expect(backupCodesFileName('m4kr', 'mark@m4kr.net', day)).toBe(
      'm4kr-backup-codes-mark-m4kr-net-2026-11-15.txt'
    );
  });

  it('lowercases and collapses every run of other characters into one hyphen', () => {
    expect(backupCodesFileName('STARTcloud Primary!', 'Ada.Lovelace+x@example.com', day)).toBe(
      'startcloud-primary-backup-codes-ada-lovelace-x-example-com-2026-11-15.txt'
    );
  });

  it('leaves out a site or an email it does not have', () => {
    expect(backupCodesFileName('', '', day)).toBe('backup-codes-2026-11-15.txt');
    expect(backupCodesFileName('m4kr', undefined, day)).toBe('m4kr-backup-codes-2026-11-15.txt');
  });
});
