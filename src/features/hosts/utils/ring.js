import { ringRows } from './series';

const DB_NAME = 'monitoring-samples';
const STORE_NAME = 'samples';
const NO_ROWS = [];

const openDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const withStore = async (mode, operation) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
};

/**
 * The key one series is kept under in the browser's ring, its parts
 * joined by a bar: the host and the series, and for a machine's series
 * the machine between them.
 *
 * @param {...string} parts - The host, the machine where there is one, and the series
 * @returns {string} The key
 */
export const ringKey = (...parts) => parts.join('|');

/**
 * The samples the browser's ring holds of one series, read from
 * IndexedDB under the origin and cut to the widest window as they are
 * read; none while the ring holds no entry or cannot be opened.
 *
 * @param {string} key - The series' key of `ringKey`
 * @param {string} [entity] - The member that tells one entity's rows from another's
 * @returns {Promise<Array<Object>>} The rows held, oldest first per entity
 */
export const loadRing = (key, entity = '') =>
  withStore('readonly', store => store.get(key))
    .then(rows => ringRows(Array.isArray(rows) ? rows : NO_ROWS, entity))
    .catch(() => NO_ROWS);

/**
 * The samples of one series written to the browser's ring, cut to the
 * widest window as they are written; a ring that cannot be opened keeps
 * nothing and nothing throws.
 *
 * @param {string} key - The series' key of `ringKey`
 * @param {Array<Object>} rows - The rows held, oldest first per entity
 * @param {string} [entity] - The member that tells one entity's rows from another's
 * @returns {Promise<void>} Settles once written
 */
export const saveRing = (key, rows, entity = '') =>
  withStore('readwrite', store => store.put(ringRows(rows, entity), key))
    .then(() => undefined)
    .catch(() => undefined);
