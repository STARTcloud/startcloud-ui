import { FaBuilding, FaCube, FaFile, FaMicrochip, FaServer, FaTag, FaUser } from 'react-icons/fa6';

import { hasFeature } from '../../utils/capabilities';
import { isGlobalAdmin } from '../../utils/permissions';
import { architecturePath, itemPath, providerPath, versionPath } from '../../utils/routes';

import { useCatalogTree } from './hooks/useCatalogTree';

const browsable = (status, account, collections) =>
  collections.length > 0 &&
  (hasFeature(status, 'browse') || (hasFeature(status, 'admin') && isGlobalAdmin(account?.user)));

/**
 * The catalog feature's sidebar groups: one Browse group over the tree of
 * `useCatalogTree` while the host mounts a collection and lists `browse`,
 * or `admin` for a global admin.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @param {Array<Object>} collections - The host's mounted collection definitions
 * @returns {Array} The sidebar groups
 */
export const sidebar = (status, account, collections) => {
  if (!browsable(status, account, collections)) {
    return [];
  }
  const useTree = () => useCatalogTree(collections, account?.user || null);
  return [{ key: 'browse', labelKey: 'pages.sidebar.browse', tree: useTree }];
};

const collectionPathOf = (row, collection) => {
  if (row.architecture && row.provider && collection.leafIsFile) {
    return architecturePath(
      collection,
      row.org,
      row.name,
      row.version,
      row.provider,
      row.architecture
    );
  }
  if (row.provider && collection.hasProviders) {
    return providerPath(collection, row.org, row.name, row.version, row.provider);
  }
  if (row.architecture && collection.hasVersions && !collection.hasProviders) {
    return providerPath(collection, row.org, row.name, row.version, row.architecture);
  }
  if (row.version && collection.hasVersions) {
    return versionPath(collection, row.org, row.name, row.version);
  }
  return itemPath(collection, row.org, row.name);
};

const KINDS = [
  { kind: 'organization', icon: FaBuilding, locators: ['org'] },
  { kind: 'item', icon: FaCube, locators: ['collection', 'org', 'name'] },
  { kind: 'version', icon: FaTag, locators: ['collection', 'org', 'name', 'version'] },
  {
    kind: 'provider',
    icon: FaServer,
    locators: ['collection', 'org', 'name', 'version', 'provider'],
  },
  {
    kind: 'architecture',
    icon: FaMicrochip,
    locators: ['collection', 'org', 'name', 'version', 'provider', 'architecture'],
  },
  {
    kind: 'artifact',
    icon: FaFile,
    locators: ['collection', 'org', 'name', 'version', 'provider', 'architecture'],
  },
  { kind: 'user', icon: FaUser, locators: ['org', 'name'] },
];

const routeOf = (kind, collections) => row => {
  if (kind === 'organization') {
    return `/${row.org}`;
  }
  if (kind === 'user') {
    return row.org ? '/org-console' : '/admin';
  }
  const collection = collections.find(entry => entry.key === row.collection);
  return collection ? collectionPathOf(row, collection) : '';
};

const iconOf = (fallback, collections) => row =>
  collections.find(entry => entry.key === row.collection)?.icon || fallback;

/**
 * The catalog feature's search kinds while the backend mounts a
 * collection: organization, item, version, provider, architecture,
 * artifact and user, a row of a collection routed to the deepest page of
 * that collection it names.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Array<Object>} collections - The host's mounted collection definitions
 * @returns {Array<Object>} The kind entries
 */
export const searchKinds = (status, collections) =>
  !hasFeature(status, 'search') || collections.length === 0
    ? []
    : KINDS.map(({ kind, icon, locators }) => ({
        kind,
        feature: 'catalog',
        token: 'browse',
        locators,
        route: routeOf(kind, collections),
        icon: iconOf(icon, collections),
        labelKey: `search.kinds.${kind}`,
        matched: {},
        facets: [],
      }));
