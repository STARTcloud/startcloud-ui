import { machineSeriesOf } from '../utils/machineSeries';
import { SERIES } from '../utils/monitoring';

import { HISTORY, LIVE, recordOf, recordsOf } from './splice';

const DB_NAME = 'monitoring-samples';
const DB_VERSION = 2;
const STORE_NAME = 'samples';
const INDEX_NAME = 'bySeries';
const KEY_PATH = ['series', 'instant', 'entity'];
const KEY_BAR = '|';
const NO_ROWS = [];
const TOP = [];

const newestHistory = new Map();

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

const createStore = db => {
  const store = db.createObjectStore(STORE_NAME, { keyPath: KEY_PATH });
  store.createIndex(INDEX_NAME, 'series');
  return store;
};

const entityMemberOf = key => {
  const metric = key.split(KEY_BAR).at(-1);
  return SERIES[metric]?.entity ?? machineSeriesOf(metric)?.entity ?? '';
};

const migrate = (db, transaction) => {
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    createStore(db);
    return;
  }
  const old = transaction.objectStore(STORE_NAME);
  const values = old.getAll();
  const keys = old.getAllKeys();
  keys.onsuccess = () => {
    db.deleteObjectStore(STORE_NAME);
    const store = createStore(db);
    keys.result.forEach((key, index) => {
      const rows = Array.isArray(values.result[index]) ? values.result[index] : NO_ROWS;
      recordsOf({ series: key, rows, entity: entityMemberOf(key), origin: HISTORY }).forEach(
        record => store.put(record)
      );
    });
  };
};

const openDb = () =>
  new Promise((resolve, reject) => {
    const factory = globalThis.indexedDB;
    if (!factory) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = factory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = event => {
      if (event.oldVersion === 1) {
        migrate(request.result, request.transaction);
      } else {
        createStore(request.result);
      }
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

const withStore = (mode, operation) =>
  connect().then(
    db =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const outcome = operation(transaction.objectStore(STORE_NAME));
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

const seriesRange = series => globalThis.IDBKeyRange.bound([series], [series, TOP]);

const instantRange = (series, from, to) =>
  globalThis.IDBKeyRange.bound([series, from], [series, to, TOP]);

const belowRange = (series, floor, from = -Infinity) =>
  globalThis.IDBKeyRange.bound([series, from], [series, floor], false, true);

const edgeIn = (store, series, direction) =>
  new Promise((resolve, reject) => {
    const request = store.openCursor(seriesRange(series), direction);
    request.onsuccess = () => {
      resolve(request.result ? request.result.value.instant : null);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });

const dropLive = (store, series, floor, from) => {
  const request = store.openCursor(belowRange(series, floor, from));
  request.onsuccess = () => {
    const cursor = request.result;
    if (cursor) {
      if (cursor.value.origin === LIVE) {
        cursor.delete();
      }
      cursor.continue();
    }
  };
};

/**
 * One pushed sample appended to the browser's store of samples, the
 * IndexedDB database `monitoring-samples` under the origin, one record a
 * sample keyed by the series, the instant and the entity, so the rows of
 * two interfaces taken at one instant are two records; a sample older
 * than the newest instant a history read answered of the series is
 * dropped, the history being the agent's own account of that span. A
 * store that cannot be opened keeps nothing and nothing throws.
 *
 * @param {string} series - The series key, the host and the series joined by a bar, the machine between them for a machine's series
 * @param {Object} row - The sample
 * @param {string} [entity] - The member that tells one entity's rows from another's
 * @returns {Promise<boolean>} Whether the sample was kept
 */
export const add = (series, row, entity = '') => {
  const record = recordOf({ series, row, entity, origin: LIVE });
  if (!record || record.instant < (newestHistory.get(series) ?? -Infinity)) {
    return Promise.resolve(false);
  }
  return withStore('readwrite', store => {
    store.put(record);
    return true;
  }).catch(() => false);
};

/**
 * The rows a history read answered written in one transaction, one
 * record a sample, a duplicate instant of one entity one record; every
 * pushed sample of the series inside the span the answer covers, from
 * its oldest instant up to its newest, is dropped, and a pushed sample
 * older than its newest is dropped from then on. Nothing throws.
 *
 * @param {string} series - The series key
 * @param {Array<Object>} rows - The rows answered, in any order
 * @param {string} [entity] - The member that tells one entity's rows from another's
 * @returns {Promise<void>} Settles once written
 */
export const addMany = (series, rows, entity = '') => {
  const records = recordsOf({ series, rows, entity, origin: HISTORY });
  if (records.length === 0) {
    return Promise.resolve();
  }
  const instants = records.map(record => record.instant);
  const newest = Math.max(...instants);
  const oldest = Math.min(...instants);
  newestHistory.set(series, Math.max(newest, newestHistory.get(series) ?? -Infinity));
  return withStore('readwrite', store => {
    records.forEach(record => store.put(record));
    dropLive(store, series, newest, oldest);
  }).catch(() => undefined);
};

/**
 * The samples of one series between two instants, both included, oldest
 * first and at one instant in the order of their entities' names, read
 * by one key range; none while the store cannot be opened.
 *
 * @param {string} series - The series key
 * @param {number} from - The first instant in milliseconds
 * @param {number} to - The last instant in milliseconds
 * @returns {Promise<Array<Object>>} The rows
 */
export const range = (series, from, to) =>
  withStore('readonly', store => settled(store.getAll(instantRange(series, from, to))))
    .then(records => records.map(record => record.row))
    .catch(() => NO_ROWS);

/**
 * The instant of the newest sample held of one series, null while none
 * is held or the store cannot be opened.
 *
 * @param {string} series - The series key
 * @returns {Promise<number|null>} The instant in milliseconds
 */
export const newest = series =>
  withStore('readonly', store => edgeIn(store, series, 'prev')).catch(() => null);

/**
 * The instant of the oldest sample held of one series, null while none
 * is held or the store cannot be opened.
 *
 * @param {string} series - The series key
 * @returns {Promise<number|null>} The instant in milliseconds
 */
export const oldest = series =>
  withStore('readonly', store => edgeIn(store, series, 'next')).catch(() => null);

/**
 * The samples of one series older than `keepMs` before the newest held
 * deleted by one key range, the age measured from the newest sample and
 * never from a clock. Nothing throws.
 *
 * @param {string} series - The series key
 * @param {number} keepMs - The span kept in milliseconds
 * @returns {Promise<void>} Settles once deleted
 */
export const trim = (series, keepMs) =>
  withStore('readwrite', store => {
    const request = store.openCursor(seriesRange(series), 'prev');
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        store.delete(belowRange(series, cursor.value.instant - keepMs));
      }
    };
  }).catch(() => undefined);
