import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { hasFeatureStrict } from '../../../utils/capabilities';
import * as vaultDb from '../lib/vaultDb';
import { fromBundle, toBundle } from '../utils/bundle';
import { downloadText } from '../utils/download';
import { fileNameOf } from '../utils/formats';
import { DEFAULT_THRESHOLD_DAYS } from '../utils/records';

import VaultSyncKeeper from './VaultSyncKeeper';

const BUNDLE_NAME = fileNameOf('vault', 'certs', 'json');

const NO_SYNC = {};

const EMPTY = {
  records: [],
  loaded: false,
  version: 0,
  preferences: { threshold_days: DEFAULT_THRESHOLD_DAYS, sync: NO_SYNC },
};

export const VaultContext = createContext(null);

const replaced = (records, record) => {
  const index = records.findIndex(entry => entry.id === record.id);
  if (index === -1) {
    return [...records, record];
  }
  return records.map((entry, at) => (at === index ? record : entry));
};

const applied = (current, event) => {
  const next = { ...current, version: current.version + 1 };
  if (event.type === 'added' || event.type === 'updated') {
    return { ...next, records: replaced(current.records, event.record) };
  }
  if (event.type === 'removed') {
    return { ...next, records: current.records.filter(entry => entry.id !== event.record.id) };
  }
  if (event.type === 'preference') {
    return { ...next, preferences: { ...current.preferences, [event.key]: event.value } };
  }
  return next;
};

/**
 * The certs feature's one context: the vault's records, read once from
 * the browser's `certs-vault` store and kept in step with every write
 * through the store's own events, the preferences store beside them, and
 * the keeper of the shared store's mirror while the host lists
 * `certs-store` and a person is signed in, handed the organization the
 * rows are sent to and the memberships the Shared page lists.
 */
const VaultProvider = ({ signedIn, user = null, organization, organizations, children }) => {
  const status = useStatus();
  const [state, setState] = useState(EMPTY);
  const [sync, setSync] = useState(null);
  const stored = hasFeatureStrict(status, 'certs-store');
  const enabled = hasFeatureStrict(status, 'certs');

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let mounted = true;
    Promise.all([
      vaultDb.list(),
      vaultDb.readPreference('threshold_days', DEFAULT_THRESHOLD_DAYS),
      vaultDb.readPreference('sync', NO_SYNC),
    ]).then(([records, threshold_days, syncPrefs]) => {
      if (mounted) {
        setState(current => ({
          ...current,
          records,
          loaded: true,
          preferences: { threshold_days, sync: syncPrefs },
        }));
      }
    });
    const unsubscribe = vaultDb.subscribe(event => {
      setState(current => applied(current, event));
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [enabled]);

  const add = useCallback(
    (record, options = {}) => vaultDb.put(record, { ...options, type: 'added' }),
    []
  );

  const update = useCallback(
    (record, patch, options = {}) =>
      vaultDb.put(
        { ...record, ...patch, updated_at: new Date().toISOString() },
        { ...options, type: 'updated' }
      ),
    []
  );

  const remove = useCallback((record, options = {}) => vaultDb.remove(record, options), []);

  const importBundle = useCallback(async text => {
    const records = fromBundle(text);
    if (!records) {
      return null;
    }
    const held = new Set((await vaultDb.list()).map(record => record.id));
    const added = records.filter(record => !held.has(record.id));
    await Promise.all(records.map(record => vaultDb.put(record, { type: 'added' })));
    return added;
  }, []);

  const exportBundle = useCallback(
    records => downloadText(toBundle(records), 'application/json', BUNDLE_NAME),
    []
  );

  const setPreference = useCallback((key, value) => vaultDb.writePreference(key, value), []);

  const value = useMemo(
    () => ({
      records: state.records,
      loaded: state.loaded,
      version: state.version,
      preferences: state.preferences,
      stored,
      signedIn,
      organization,
      organizations,
      sync,
      add,
      update,
      remove,
      importBundle,
      exportBundle,
      setPreference,
    }),
    [
      state,
      stored,
      signedIn,
      organization,
      organizations,
      sync,
      add,
      update,
      remove,
      importBundle,
      exportBundle,
      setPreference,
    ]
  );

  return (
    <VaultContext.Provider value={value}>
      {enabled && stored && signedIn ? (
        <VaultSyncKeeper organization={organization} user={user} onApi={setSync} />
      ) : null}
      {children}
    </VaultContext.Provider>
  );
};

VaultProvider.propTypes = {
  signedIn: PropTypes.bool.isRequired,
  user: PropTypes.object,
  organization: PropTypes.string.isRequired,
  organizations: PropTypes.array.isRequired,
  children: PropTypes.node.isRequired,
};

export default VaultProvider;

/**
 * The vault every certs page draws from: `records`, whether they are
 * `loaded`, the `version` raised on every write, the `preferences`
 * (`threshold_days` and `sync`), whether the host `stored` rows, whether
 * a person is `signedIn`, the active `organization` and the person's
 * `organizations`, the mirror's `sync` (`mirror`, `pull`) while it runs
 * and null otherwise, and the writes `add(record)`, `update(record, patch)`, `remove(record)`,
 * `importBundle(text)` (answering the records the vault did not hold,
 * null for text that is no bundle), `exportBundle(records)` and
 * `setPreference(key, value)`, every other write answering the record
 * written and raising the event the records follow.
 *
 * @returns {Object} The vault
 */
export const useVault = () => useContext(VaultContext);
