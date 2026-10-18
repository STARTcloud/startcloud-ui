import { KINDS } from './records';

export const BUNDLE_VERSION = 1;

export const BUNDLE_EXTENSION = '.certs.json';

const isRecord = entry =>
  Boolean(entry) &&
  typeof entry === 'object' &&
  typeof entry.id === 'string' &&
  KINDS.includes(entry.kind);

/**
 * The vault's records as a bundle, the text of a `*.certs.json` file,
 * `{ version: 1, records }`.
 *
 * @param {Array<Object>} records - The records
 * @returns {string} The JSON text
 */
export const toBundle = records => JSON.stringify({ version: BUNDLE_VERSION, records }, null, 2);

/**
 * The records a bundle's text holds, every entry that is a record of a
 * known kind; null for text that is not a bundle.
 *
 * @param {string} text - The file's text
 * @returns {Array<Object>|null} The records, or null
 */
export const fromBundle = text => {
  try {
    const parsed = JSON.parse(text);
    if (parsed?.version !== BUNDLE_VERSION || !Array.isArray(parsed.records)) {
      return null;
    }
    return parsed.records.filter(isRecord);
  } catch {
    return null;
  }
};
