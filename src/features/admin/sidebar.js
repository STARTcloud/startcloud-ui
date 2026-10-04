import { FaBuilding, FaCircleUp, FaGear, FaHardDrive, FaUsers } from 'react-icons/fa6';

import { configNamesOf, useConfigTree } from '../../hooks/useConfigTree';
import { hasFeature } from '../../utils/capabilities';
import { isGlobalAdmin } from '../../utils/permissions';
import { arrivalPath } from '../../utils/searchRow';

/**
 * The shared admin feature's sidebar groups for a `ROLE_ADMIN` account on
 * a host that advertises `admin`: one Admin group with the Users,
 * Organizations, Configuration, System and Update rows the admin adapter
 * carries, the configuration tree in the Configuration row's place while
 * `status.config` names more than one file.
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
  if (admin.update) {
    items.push({
      key: 'update',
      icon: FaCircleUp,
      labelKey: 'hosts.nav.update',
      to: '/admin/update',
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
      sections: [{ key: 'system', labelKey: 'admin.sidebar.system', items }],
      ...(configTree ? { tree: useTree } : {}),
    },
  ];
};

const kindEntry = (kind, icon, path) => ({
  kind,
  feature: 'admin',
  token: 'admin',
  locators: [kind === 'organization' ? 'org' : 'name'],
  route: (row, query) => arrivalPath(path, row, query),
  icon: () => icon,
  labelKey: `search.kinds.${kind}`,
  matched: {},
  facets: [],
});

/**
 * The shared admin feature's search kinds for a `ROLE_ADMIN` account on a
 * host that advertises `admin`: organization and user, routed to the
 * Organizations and Users pages the admin adapter carries.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Object} account - The session state from `useSession`
 * @param {Object} admin - The app's admin adapter
 * @returns {Array<Object>} The kind entries
 */
export const searchKinds = (status, account, admin) => {
  if (!hasFeature(status, 'admin') || !isGlobalAdmin(account?.user)) {
    return [];
  }
  return [
    ...(admin.organizations ? [kindEntry('organization', FaBuilding, '/admin/organizations')] : []),
    ...(admin.users ? [kindEntry('user', FaUsers, '/admin/users')] : []),
  ];
};
