const DB_NAME = 'certs-vault';
const DB_VERSION = 1;
const RECORDS = 'records';
const PREFERENCES = 'preferences';
const NO_RECORDS = [];

const listeners = new Set();

let opening = null;

const settled = request =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });

const createStores = db => {
  const records = db.createObjectStore(RECORDS, { keyPath: 'id' });
  records.createIndex('kind', 'kind');
  records.createIndex('updated_at', 'updated_at');
  db.createObjectStore(PREFERENCES);
};

const openDb = () =>
  new Promise((resolve, reject) => {
    const factory = globalThis.indexedDB;
    if (!factory) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = factory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      createStores(request.result);
    };
    request.onblocked = () => {
      reject(new Error('IndexedDB is blocked'));
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        opening = null;
      };
      db.onclose = () => {
        opening = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });

const connect = () => {
  opening ||= openDb().catch(error => {
    opening = null;
    throw error;
  });
  return opening;
};

const withStore = (name, mode, operation) =>
  connect().then(
    db =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(name, mode);
        const outcome = operation(transaction.objectStore(name));
        transaction.oncomplete = () => {
          resolve(outcome);
        };
        transaction.onerror = () => {
          reject(transaction.error);
        };
        transaction.onabort = () => {
          reject(transaction.error);
        };
      })
  );

const emit = event => {
  [...listeners].forEach(listener => listener(event));
};

/**
 * Subscribes to the vault's writes: the listener is called with
 * `{ type, record, source }`, `type` one of `added`, `updated`, `removed`
 * and `cleared`, and `source` the word the writer gave, `local` unless
 * it named another.
 *
 * @param {Function} listener - Called on every write
 * @returns {Function} Unsubscribes
 */
export const subscribe = listener => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Every record of the vault, none while the store cannot be opened.
 *
 * @returns {Promise<Array<Object>>} The records
 */
export const list = () =>
  withStore(RECORDS, 'readonly', store => settled(store.getAll()))
    .then(records => records || NO_RECORDS)
    .catch(() => NO_RECORDS);

/**
 * One record by id, null while none is held or the store cannot be opened.
 *
 * @param {string} id - The record's id
 * @returns {Promise<Object|null>} The record
 */
export const get = id =>
  withStore(RECORDS, 'readonly', store => settled(store.get(id)))
    .then(record => record || null)
    .catch(() => null);

/**
 * Writes one record whole and raises one `added` or `updated` event;
 * the record is answered as written, and nothing throws.
 *
 * @param {Object} record - The record
 * @param {Object} [options] - The write's side
 * @param {string} [options.type] - `added` or `updated`
 * @param {string} [options.source] - The writer's word, `local` by default
 * @returns {Promise<Object>} The record written
 */
export const put = (record, { type = 'updated', source = 'local' } = {}) =>
  withStore(RECORDS, 'readwrite', store => {
    store.put(record);
    return record;
  })
    .catch(() => record)
    .then(written => {
      emit({ type, record: written, source });
      return written;
    });

/**
 * Removes one record and raises one `removed` event carrying the record
 * removed; nothing throws.
 *
 * @param {Object} record - The record
 * @param {Object} [options] - The write's side
 * @param {string} [options.source] - The writer's word, `local` by default
 * @returns {Promise<Object>} The record removed
 */
export const remove = (record, { source = 'local' } = {}) =>
  withStore(RECORDS, 'readwrite', store => {
    store.delete(record.id);
    return record;
  })
    .catch(() => record)
    .then(removed => {
      emit({ type: 'removed', record: removed, source });
      return removed;
    });

/**
 * One preference by key, `fallback` while none is held or the store
 * cannot be opened.
 *
 * @param {string} key - The preference's key
 * @param {*} fallback - The value answered while none is held
 * @returns {Promise<*>} The value
 */
export const readPreference = (key, fallback) =>
  withStore(PREFERENCES, 'readonly', store => settled(store.get(key)))
    .then(value => (value === undefined ? fallback : value))
    .catch(() => fallback);

/**
 * Writes one preference and raises one `preference` event; nothing throws.
 *
 * @param {string} key - The preference's key
 * @param {*} value - The value
 * @returns {Promise<*>} The value written
 */
export const writePreference = (key, value) =>
  withStore(PREFERENCES, 'readwrite', store => {
    store.put(value, key);
    return value;
  })
    .catch(() => value)
    .then(written => {
      emit({ type: 'preference', key, value: written, source: 'local' });
      return written;
    });
