import { hasFeature } from '../../utils/capabilities';
import { isGlobalAdmin } from '../../utils/permissions';

import { useCatalogTree } from './hooks/useCatalogTree';

/**
 * The catalog feature's sidebar export of the navbar contract's Sidebar
 * section: nothing unless the host mounts a collection; else one Browse
 * group holding the tree of `useCatalogTree` alone (the column's brand
 * link is the way home), one root node per mounted collection folding
 * down to its organizations, their items and, for a versioned collection,
 * the versions, listing what the adapters answer the visitor (the public
 * rows signed out), so the column follows the crumbs of wherever the
 * person is in the catalog; the group is answered for every visitor,
 * signed in or not, while the host advertises `browse`, else for a
 * `ROLE_ADMIN` account alone while the host advertises `admin`, else not
 * at all; the shell draws the group only while the host lists the
 * `sidebar` token, that gate living on `sidebarEntries` and not here.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @param {Array<Object>} collections - The host's mounted collection definitions
 * @returns {Array} The sidebar groups
 */
export const sidebar = (status, account, collections) => {
  if (collections.length === 0) {
    return [];
  }
  const open =
    hasFeature(status, 'browse') || (hasFeature(status, 'admin') && isGlobalAdmin(account?.user));
  if (!open) {
    return [];
  }
  const useTree = () => useCatalogTree(collections, account?.user || null);
  return [{ key: 'browse', labelKey: 'pages.sidebar.browse', tree: useTree }];
};
