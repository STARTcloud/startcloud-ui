const part = text =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');

/**
 * The name the browser saves a person's backup codes under: the site's
 * brand name, the person's email and the day, each lowercased with every
 * run of characters outside letters and digits turned into one hyphen,
 * so the file says whose codes it holds and for which site.
 *
 * @param {string} site - The host's `brand.name`
 * @param {string} email - The person's email address
 * @param {Date} [date] - The day, today by default
 * @returns {string} For example `m4kr-backup-codes-mark-m4kr-net-2026-11-15.txt`
 */
export const backupCodesFileName = (site, email, date = new Date()) => {
  const stem = [part(site), 'backup-codes', part(email), date.toISOString().slice(0, 10)]
    .filter(Boolean)
    .join('-');
  return `${stem}.txt`;
};
