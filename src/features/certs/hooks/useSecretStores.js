import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useNotify } from '../../../contexts/NoticeContext';
import { useStatus } from '../../../contexts/StatusContext';
import { log } from '../../../lib/logger';
import { authMethod, hasFeatureStrict } from '../../../utils/capabilities';
import { refusalMessage } from '../../../utils/validation';
import { fetchIdpCerts } from '../api/certsStore';
import { BACKEND_DESTINATION, IDP, IDP_DESTINATION } from '../utils/destinations';
import { VAULT, copyOf, pendingWrites, syncMapOf, unionOf } from '../utils/stores';
import { DETACHED, ownMembersOf, rowOf } from '../utils/sync';

import { useSharedRows } from './useSharedRows';
import { useVault } from './useVault';

const SYNC_WRITE = { source: 'sync' };

const PREFERENCES_ROUTES = {
  backend: '/profile/preferences',
  apikey: '/profile/preferences',
  cookie: '/user/profile/preferences',
};

const SETTINGS_HASH = '#certs-preferences';

const NO_ROWS = [];

const initialOf = name =>
  String(name || '')
    .trim()
    .charAt(0)
    .toUpperCase();

const rowsCopies = rows => (rows || NO_ROWS).map(row => copyOf({ row }));

const recordsCopies = records => records.map(record => copyOf({ record }));

const newestOf = runs =>
  Object.values(runs || {})
    .filter(Boolean)
    .sort()
    .at(-1) || '';

const remoteStore = ({ key, letter, name, organization, links, rows, writes }) => ({
  key,
  letter,
  name,
  organization,
  links,
  copies: rowsCopies(rows),
  ...writes,
});

const destinationWrites = (destination, organization) => ({
  create: record => destination.create(rowOf(record, organization)),
  update: (row, record) => destination.update(row.id, rowOf(record, row.organization || '')),
  remove: row => destination.remove(row.id),
});

const hostStoreOf = ({ host, role, t }) =>
  host
    ? remoteStore({
        key: host.key,
        letter: t('certs.stores.hostLetter'),
        name: host.name,
        organization: '',
        links: host.key === role ? BACKEND_DESTINATION : null,
        rows: host.rows,
        writes: { create: host.create, update: host.update, remove: host.remove },
      })
    : null;

const backendStoreOf = ({ listed, role, brand, organization, rows }) =>
  listed
    ? remoteStore({
        key: role,
        letter: initialOf(brand),
        name: brand,
        organization,
        links: BACKEND_DESTINATION,
        rows,
        writes: destinationWrites(BACKEND_DESTINATION, organization),
      })
    : null;

const idpStoreOf = ({ vault, rows, t }) =>
  vault.idp.stored
    ? remoteStore({
        key: IDP,
        letter: t('certs.stores.idpLetter'),
        name: vault.idp.name || t('certs.stores.idpName'),
        organization: vault.organization,
        links: IDP_DESTINATION,
        rows,
        writes: destinationWrites(IDP_DESTINATION, vault.organization),
      })
    : null;

const loadedOf = ({ kept, listed, vault, shared, idpRows, host }) =>
  (!kept || vault.loaded) &&
  (!listed || shared.loaded) &&
  (!vault.idp.stored || idpRows.loaded) &&
  (!host || host.loaded);

const linkedMembers = (store, copy) =>
  store.links === BACKEND_DESTINATION ? ownMembersOf(copy.record) : { idp_id: copy.row.id };

/**
 * The stores a page of secrets lists and their writes: this host's store
 * where the page hands one, the serving backend's store while it lists
 * `certs-store` for a signed-in person and is not the host itself, the
 * identity provider's store while its own status lists `certs-store`,
 * and this browser's Vault while the host lists `certs`, each
 * `{ key, letter, name }`, the host under the key the page names, the
 * backend under its role name, the identity provider under `idp` and the
 * Vault under `vault`; `rows` the union of every store's rows by stable
 * id; `columnStores` every store but the Vault on the Vault page.
 * `toggle(row, key, on)` writes the row's newest copy to the store and
 * turns the row's `sync` map on for it, or removes the store's copy and
 * turns it off, the map kept on the Vault's copy and the host's copy, and
 * on every remote copy when the Vault is turned off, so no pull brings
 * it back; a write to a store the mirror keeps links the Vault's copy to
 * the row it answered. `syncNow(rows)` writes every copy the rows' maps,
 * else the `sync` preference, want and the store lacks or holds older,
 * then runs each mirror's pull, its completion kept in `last_synced`;
 * `lastSynced` is the newest of those; `settings()` opens the
 * Certificates card of the Preferences section. Each write is one
 * request, and a refusal is one danger notice.
 *
 * @param {Object} options - The page's side
 * @param {string} options.page - `host`, `vault` or `backend`, the page drawing the rows
 * @param {Object|null} [options.host] - This host's store, `{ key, name, rows, loaded, served, create, update, remove, refresh }`
 * @returns {Object} The stores, the rows and the writes
 */
export const useSecretStores = ({ page, host = null }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const notify = useNotify();
  const navigate = useNavigate();
  const vault = useVault();
  const [busy, setBusy] = useState(false);
  const role = status.role || '';
  const listed = Boolean(vault.stored && vault.signedIn && !host?.served);
  const shared = useSharedRows(vault.organizations, listed);
  const idpRows = useSharedRows(vault.organizations, vault.idp.stored, fetchIdpCerts);
  const kept = hasFeatureStrict(status, 'certs');
  const brand = status.brand?.name || role;
  const defaults = vault.preferences.sync;

  const hosted = hostStoreOf({ host, role, t });
  const backend = backendStoreOf({
    listed,
    role,
    brand,
    organization: vault.organization,
    rows: shared.rows,
  });
  const idp = idpStoreOf({ vault, rows: idpRows.rows, t });
  const remotes = [hosted, backend, idp].filter(Boolean);
  const stores = [
    ...remotes,
    ...(kept
      ? [
          {
            key: VAULT,
            letter: t('certs.stores.vaultLetter'),
            name: t('certs.sidebar.vault'),
            copies: recordsCopies(vault.records),
          },
        ]
      : []),
  ];
  const rows = unionOf(stores);
  const remoteOf = key => remotes.find(store => store.key === key) || null;

  const refresh = useCallback(() => {
    host?.refresh();
    shared.read();
    idpRows.read();
  }, [host, shared, idpRows]);

  const refused = error => {
    log.api.error('Secret store write refused', { error: error.message });
    notify('danger', refusalMessage({ error, t }));
  };

  const vaultMembersOf = row => {
    const own = row.held[VAULT];
    if (own) {
      return { ...ownMembersOf(own.record), idp_id: own.record.idp_id ?? null };
    }
    return remotes
      .filter(store => store.links && row.held[store.key])
      .reduce((members, store) => ({ ...members, ...linkedMembers(store, row.held[store.key]) }), {
        ...DETACHED,
      });
  };

  const writeCopy = async (key, row, record) => {
    if (key === VAULT) {
      await vault.add({ ...record, ...vaultMembersOf(row), id: row.id }, SYNC_WRITE);
      return true;
    }
    const store = remoteOf(key);
    const held = row.held[key];
    const answer = held ? await store.update(held.row, record) : await store.create(record);
    const own = row.held[VAULT];
    if (store.links && own && answer && !store.links.idOf(own.record)) {
      const map = record.sync || own.record.sync;
      await vault.add(
        store.links.link({ ...own.record, sync: map }, answer, store.organization),
        SYNC_WRITE
      );
      return true;
    }
    return false;
  };

  const removeCopy = async (key, row, map) => {
    const held = row.held[key];
    if (key === VAULT) {
      await vault.remove(held.record, SYNC_WRITE);
      return true;
    }
    const store = remoteOf(key);
    await store.remove(held.row);
    const own = row.held[VAULT];
    if (store.links && own && store.links.idOf(own.record) === held.row.id) {
      await vault.add({ ...own.record, sync: map, ...store.links.unlink }, SYNC_WRITE);
      return true;
    }
    return false;
  };

  const keepMap = async ({ row, key, on, map, vaultWritten }) => {
    const own = row.held[VAULT];
    if (own && key !== VAULT && !vaultWritten) {
      await vault.add({ ...own.record, sync: map }, SYNC_WRITE);
    }
    const mapped = remotes.filter(
      store =>
        store.key !== key && row.held[store.key] && (store === hosted || (key === VAULT && !on))
    );
    await Promise.all(
      mapped.map(store =>
        store.update(row.held[store.key].row, { ...row.held[store.key].record, sync: map })
      )
    );
  };

  const toggle = async (row, key, on) => {
    const map = { ...syncMapOf(row), [key]: on };
    const name = stores.find(store => store.key === key)?.name || key;
    setBusy(true);
    try {
      let vaultWritten = false;
      if (on) {
        vaultWritten = await writeCopy(key, row, { ...row.record, sync: map });
      } else if (row.held[key]) {
        vaultWritten = await removeCopy(key, row, map);
      }
      await keepMap({ row, key, on, map, vaultWritten });
      notify(
        'success',
        t(on ? 'certs.stores.turnedOn' : 'certs.stores.turnedOff', { name: row.name, store: name })
      );
    } catch (error) {
      refused(error);
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const syncNow = async picked => {
    const keys = stores.map(store => store.key);
    const writes = pendingWrites(picked, keys, defaults);
    setBusy(true);
    const answers = await Promise.all(
      writes.map(({ row, key }) =>
        writeCopy(key, row, row.record).then(
          () => true,
          error => {
            refused(error);
            return false;
          }
        )
      )
    );
    const pulls = [vault.sync, vault.idpSync].filter(Boolean);
    if (pulls.length > 0) {
      await Promise.all(pulls.map(mirror => mirror.pull()));
    } else {
      await vault.setPreference('last_synced', {
        ...vault.preferences.last_synced,
        [VAULT]: new Date().toISOString(),
      });
    }
    setBusy(false);
    refresh();
    notify('success', t('certs.stores.synced', { count: answers.filter(Boolean).length }));
  };

  const settingsTo = PREFERENCES_ROUTES[authMethod(status)] || '';

  return {
    stores: stores.map(({ key, letter, name }) => ({ key, letter, name })),
    columnStores: stores
      .filter(store => page !== 'vault' || store.key !== VAULT)
      .map(({ key, letter, name }) => ({ key, letter, name })),
    rows,
    loaded: loadedOf({ kept, listed, vault, shared, idpRows, host }),
    failed: listed && shared.failed,
    busy,
    lastSynced: newestOf(vault.preferences.last_synced),
    toggle,
    syncNow,
    refresh,
    settings: settingsTo ? () => navigate(`${settingsTo}${SETTINGS_HASH}`) : null,
  };
};
