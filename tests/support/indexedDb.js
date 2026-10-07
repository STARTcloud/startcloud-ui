const ORDER = { number: 0, string: 1, array: 2 };

const kindOf = key => (Array.isArray(key) ? 'array' : typeof key);

const compareScalars = (first, second) => {
  if (first < second) {
    return -1;
  }
  return first > second ? 1 : 0;
};

export const compareKeys = (first, second) => {
  const kind = kindOf(first);
  if (kind !== kindOf(second)) {
    return ORDER[kind] - ORDER[kindOf(second)];
  }
  if (kind !== 'array') {
    return compareScalars(first, second);
  }
  const shared = Math.min(first.length, second.length);
  for (let index = 0; index < shared; index += 1) {
    const order = compareKeys(first[index], second[index]);
    if (order !== 0) {
      return order;
    }
  }
  return first.length - second.length;
};

class KeyRange {
  constructor({ lower, upper, lowerOpen = false, upperOpen = false }) {
    this.lower = lower;
    this.upper = upper;
    this.lowerOpen = lowerOpen;
    this.upperOpen = upperOpen;
  }

  static bound(lower, upper, lowerOpen = false, upperOpen = false) {
    return new KeyRange({ lower, upper, lowerOpen, upperOpen });
  }

  static lowerBound(lower, lowerOpen = false) {
    return new KeyRange({ lower, lowerOpen });
  }

  static upperBound(upper, upperOpen = false) {
    return new KeyRange({ upper, upperOpen });
  }

  static only(key) {
    return new KeyRange({ lower: key, upper: key });
  }

  includes(key) {
    if (this.lower !== undefined) {
      const order = compareKeys(key, this.lower);
      if (order < 0 || (order === 0 && this.lowerOpen)) {
        return false;
      }
    }
    if (this.upper !== undefined) {
      const order = compareKeys(key, this.upper);
      if (order > 0 || (order === 0 && this.upperOpen)) {
        return false;
      }
    }
    return true;
  }
}

const rangeOf = query => {
  if (query === undefined || query === null) {
    return new KeyRange({});
  }
  return query instanceof KeyRange ? query : KeyRange.only(query);
};

const keyOf = (keyPath, value) =>
  Array.isArray(keyPath) ? keyPath.map(member => value[member]) : value[keyPath];

class Cursor {
  constructor(handle, entries, request) {
    this.handle = handle;
    this.entries = entries;
    this.request = request;
    this.index = 0;
  }

  get key() {
    return this.entries[this.index].key;
  }

  get value() {
    return this.entries[this.index].value;
  }

  delete() {
    this.handle.store.remove(this.key);
  }

  continue() {
    this.index += 1;
    this.handle.transaction.fire(this.request, () =>
      this.index < this.entries.length ? this : null
    );
  }
}

class StoreHandle {
  constructor(store, transaction) {
    this.store = store;
    this.transaction = transaction;
  }

  put(value, key) {
    return this.transaction.request(() => this.store.write(value, key));
  }

  get(key) {
    return this.transaction.request(() => this.store.find(key)?.value);
  }

  getAll(query) {
    return this.transaction.request(() => this.store.matching(rangeOf(query)).map(e => e.value));
  }

  getAllKeys(query) {
    return this.transaction.request(() => this.store.matching(rangeOf(query)).map(e => e.key));
  }

  delete(query) {
    return this.transaction.request(() => {
      this.store.matching(rangeOf(query)).forEach(entry => this.store.remove(entry.key));
    });
  }

  count(query) {
    return this.transaction.request(() => this.store.matching(rangeOf(query)).length);
  }

  openCursor(query, direction = 'next') {
    return this.transaction.request(request => {
      const entries = this.store.matching(rangeOf(query));
      if (direction === 'prev') {
        entries.reverse();
      }
      return entries.length > 0 ? new Cursor(this, entries, request) : null;
    });
  }

  createIndex(name, keyPath) {
    this.store.indexes.set(name, keyPath);
  }
}

class Transaction {
  constructor(db, names, mode) {
    this.db = db;
    this.names = names;
    this.mode = mode;
    this.pending = 0;
    this.finished = false;
    this.error = null;
    this.oncomplete = null;
    this.onerror = null;
    this.onabort = null;
  }

  objectStore(name) {
    return new StoreHandle(this.db.stores.get(name), this);
  }

  fire(request, work) {
    this.pending += 1;
    queueMicrotask(() => {
      request.result = work(request);
      this.pending -= 1;
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
      this.settle();
    });
    return request;
  }

  request(work) {
    return this.fire({ result: undefined, error: null, onsuccess: null, onerror: null }, work);
  }

  settle() {
    queueMicrotask(() => {
      if (this.pending === 0 && !this.finished) {
        this.finished = true;
        if (this.oncomplete) {
          this.oncomplete({ target: this });
        }
      }
    });
  }
}

class Store {
  constructor(name, options = {}) {
    this.name = name;
    this.keyPath = options.keyPath ?? null;
    this.entries = [];
    this.indexes = new Map();
  }

  at(key) {
    let low = 0;
    let high = this.entries.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (compareKeys(this.entries[middle].key, key) < 0) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    return low;
  }

  find(key) {
    const index = this.at(key);
    const entry = this.entries[index];
    return entry && compareKeys(entry.key, key) === 0 ? entry : undefined;
  }

  write(value, explicit) {
    const key = this.keyPath === null ? explicit : keyOf(this.keyPath, value);
    const index = this.at(key);
    const held = this.entries[index];
    if (held && compareKeys(held.key, key) === 0) {
      held.value = value;
    } else {
      this.entries.splice(index, 0, { key, value });
    }
    return key;
  }

  remove(key) {
    const entry = this.find(key);
    if (entry) {
      this.entries.splice(this.entries.indexOf(entry), 1);
    }
  }

  matching(range) {
    return this.entries.filter(entry => range.includes(entry.key));
  }
}

class Database {
  constructor(record) {
    this.record = record;
    this.name = record.name;
    this.version = record.version;
    this.stores = record.stores;
    this.closed = false;
    this.upgrade = null;
    this.onversionchange = null;
    this.onclose = null;
  }

  get objectStoreNames() {
    return { contains: name => this.stores.has(name) };
  }

  createObjectStore(name, options) {
    const store = new Store(name, options);
    this.stores.set(name, store);
    return new StoreHandle(store, this.upgrade);
  }

  deleteObjectStore(name) {
    this.stores.delete(name);
  }

  transaction(names, mode = 'readonly') {
    return new Transaction(this, [names].flat(), mode);
  }

  close() {
    this.closed = true;
  }
}

/**
 * An in-memory stand-in for the IndexedDB a browser offers, implementing
 * what the chart store uses: `open` with an upgrade, object stores with
 * a key path or explicit keys, `put`, `get`, `getAll`, `getAllKeys`,
 * `delete` by key or range, cursors both ways, indexes as names alone,
 * and `IDBKeyRange`; every callback fires on a microtask and compound
 * keys compare element by element as the standard orders them.
 *
 * @returns {{ indexedDB: { open: Function }, IDBKeyRange: Function, databases: Map }} The factory, the key range and the databases held
 */
export const createIndexedDb = () => {
  const databases = new Map();

  const open = (name, version = 1) => {
    const request = {
      result: undefined,
      error: null,
      transaction: null,
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      onblocked: null,
    };
    queueMicrotask(() => {
      const held = databases.get(name) || { name, version: 0, stores: new Map() };
      if (version < held.version) {
        request.error = new Error('VersionError');
        if (request.onerror) {
          request.onerror({ target: request });
        }
        return;
      }
      databases.set(name, held);
      const db = new Database(held);
      request.result = db;
      if (version > held.version) {
        const oldVersion = held.version;
        held.version = version;
        db.version = version;
        const upgrade = new Transaction(db, [...held.stores.keys()], 'versionchange');
        db.upgrade = upgrade;
        request.transaction = upgrade;
        upgrade.oncomplete = () => {
          if (request.onsuccess) {
            request.onsuccess({ target: request });
          }
        };
        if (request.onupgradeneeded) {
          request.onupgradeneeded({ target: request, oldVersion, newVersion: version });
        }
        upgrade.settle();
        return;
      }
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    });
    return request;
  };

  return { indexedDB: { open }, IDBKeyRange: KeyRange, databases };
};

/**
 * Installs a fresh stand-in as the global `indexedDB` and `IDBKeyRange`.
 *
 * @returns {{ indexedDB: { open: Function }, IDBKeyRange: Function, databases: Map }} The stand-in installed
 */
export const installIndexedDb = () => {
  const fake = createIndexedDb();
  globalThis.indexedDB = fake.indexedDB;
  globalThis.IDBKeyRange = fake.IDBKeyRange;
  return fake;
};
