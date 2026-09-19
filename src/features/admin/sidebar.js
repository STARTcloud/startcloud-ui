import { FaBuilding, FaGear, FaHardDrive, FaUsers } from 'react-icons/fa6';

import { configNamesOf, useConfigTree } from '../../hooks/useConfigTree';
import { hasFeature } from '../../utils/capabilities';
import { isGlobalAdmin } from '../../utils/permissions';

/**
 * The shared admin feature's sidebar export: on every host that
 * advertises `admin`, for a `ROLE_ADMIN` account, one Admin group with
 * Users at `/admin/users` and Organizations at `/admin/organizations`
 * (the identity feature's two pages over the app's `users` and
 * `organizations` adapters), Configuration at `/admin/config` and System
 * at `/admin/system`, each drawn only while the app's `admin` adapter
 * carries `users`, `organizations`, `config` or `storage`; the
 * Configuration entry is the plain row while `status.config` names one
 * file and the configuration tree of identity contract decision 122, one
 * Configuration node with one child per file over the shared
 * `useConfigTree` fed the adapter's `config` and the System heading's
 * key, answered as the tree's `labelKey` (decision 135), while it names
 * more;
 * nothing when the adapter carries none, and never a branch on the host's
 * role.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @param {Object} admin - The app's admin adapter
 * @returns {Array} The sidebar groups
 */
export const sidebar = (status, account, admin) => {
  if (!hasFeature(status, 'admin') || !isGlobalAdmin(account?.user)) {
    return [];
  }
  const configTree = admin.config && configNamesOf(status).length > 1;
  const items = [];
  if (admin.users) {
    items.push({
      key: 'users',
      icon: FaUsers,
      labelKey: 'admin.users.title',
      to: '/admin/users',
    });
  }
  if (admin.organizations) {
    items.push({
      key: 'organizations',
      icon: FaBuilding,
      labelKey: 'admin.organizations.all',
      to: '/admin/organizations',
    });
  }
  if (admin.config && !configTree) {
    items.push({
      key: 'config',
      icon: FaGear,
      labelKey: 'admin.tabs.configManagement',
      to: '/admin/config',
    });
  }
  if (admin.storage) {
    items.push({
      key: 'system',
      icon: FaHardDrive,
      labelKey: 'admin.tabs.system',
      to: '/admin/system',
    });
  }
  if (items.length === 0 && !configTree) {
    return [];
  }
  const useTree = () => useConfigTree(admin.config, 'admin.sidebar.system');
  return [
    {
      key: 'admin',
      labelKey: 'admin.sidebar.title',
      sections: [{ key: 'admin', labelKey: 'admin.sidebar.title', items }],
      ...(configTree ? { tree: useTree } : {}),
    },
  ];
};
