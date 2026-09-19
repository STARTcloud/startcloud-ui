import { useCatalogTree } from './hooks/useCatalogTree';

/**
 * The catalog feature's sidebar export of the navbar contract's Sidebar
 * section: nothing unless the host mounts a collection; else, for every
 * visitor, one Catalog group holding the Browse tree of `useCatalogTree`
 * alone (the column's brand link is the way home), one root node per
 * mounted collection folding down to its organizations, their items and,
 * for a versioned collection, the versions, listing what the adapters
 * answer the visitor (the public rows signed out), so the column follows
 * the crumbs of wherever the person is in the catalog; the shell draws
 * the group only while the host lists the `sidebar` token, the gate
 * living on `sidebarEntries` and not here.
 *
 * @param {Object} account - The session state from `useSession`
 * @param {Array<Object>} collections - The host's mounted collection definitions
 * @returns {Array} The sidebar groups
 */
export const sidebar = (account, collections) => {
  if (collections.length === 0) {
    return [];
  }
  const useTree = () => useCatalogTree(collections, account?.user || null);
  return [{ key: 'catalog', labelKey: 'pages.sidebar.title', tree: useTree }];
};
