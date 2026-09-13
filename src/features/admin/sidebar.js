import { FaBuilding, FaGear, FaHardDrive } from 'react-icons/fa6';

import { configNamesOf, useConfigTree } from '../../hooks/useConfigTree';
import { hasFeature } from '../../utils/capabilities';

const isAdmin = account =>
  Boolean(
    account?.user?.roles?.includes('ROLE_ADMIN') ||
    account?.user?.authorities?.includes('ROLE_ADMIN')
  );

/**
 * The shared admin feature's sidebar export: on every host that
 * advertises `admin`, for a `ROLE_ADMIN` account, one Admin group with
 * Organizations and users at `/admin`, Configuration at `/admin/config`
 * and System at `/admin/system`, each drawn only while the app's `admin`
 * adapter carries `organizationsWithUsers`, `config` or `storage`; the
 * Configuration entry is the plain row while `status.config` names one
 * file and the configuration tree of identity contract decision 122, one
 * Configuration node with one child per file over the shared
 * `useConfigTree` fed the adapter's `config`, while it names more;
 * nothing when the adapter carries none, and never a branch on the host's
 * role.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @param {Object} admin - The app's admin adapter
 * @returns {Array} The sidebar groups
 */
export const sidebar = (status, account, admin) => {
  if (!hasFeature(status, 'admin') || !isAdmin(account)) {
    return [];
  }
  const configTree = admin.config && configNamesOf(status).length > 1;
  const items = [];
  if (admin.organizationsWithUsers) {
    items.push({
      key: 'organizations',
      icon: FaBuilding,
      labelKey: 'admin.tabs.orgsAndUsers',
      to: '/admin',
      end: true,
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
  const useTree = () => useConfigTree(admin.config);
  return [
    {
      key: 'admin',
      labelKey: 'admin.sidebar.title',
      sections: [{ key: 'admin', labelKey: 'admin.sidebar.title', items }],
      ...(configTree ? { tree: useTree } : {}),
    },
  ];
};
