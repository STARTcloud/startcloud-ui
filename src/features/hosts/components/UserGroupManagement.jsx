import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import TabStrip from '../../../components/common/TabStrip';

import GroupSection, { CreateGroupButton } from './GroupSection';
import RBACDiscoverySection from './RBAC/DiscoverySection';
import RoleSection, { CreateRoleButton } from './RoleSection';
import UserSection, { CreateUserButton } from './UserSection';

const TABS = [
  { key: 'users', labelKey: 'host.userGroupManagement.users' },
  { key: 'groups', labelKey: 'host.userGroupManagement.groups' },
  { key: 'roles', labelKey: 'host.userGroupManagement.roles' },
  { key: 'rbac', labelKey: 'host.userGroupManagement.rbacDiscovery' },
];

const CREATES = {
  users: CreateUserButton,
  groups: CreateGroupButton,
  roles: CreateRoleButton,
};

const namesOf = (rows, member) => rows.map(row => row[member]).filter(Boolean);

/**
 * The users, the groups, the roles and the RBAC discovery of a host,
 * hyperweaver-ui's user and group management as the body of the Manage
 * page's Users and groups section: the four on the one tab strip, the
 * create button of the shown tab beside it, and under it that tab's
 * table over the rows the page's binding left, every tab's request
 * filters in the navbar's panel.
 */
const UserGroupManagement = ({ id, hostname, ctx, tables, readings, rows, filtering }) => {
  const { t } = useTranslation();
  const [active, setActive] = useState('users');
  const [creating, setCreating] = useState(false);
  const Create = CREATES[active];
  const select = key => {
    setActive(key);
    setCreating(false);
  };
  const shared = { id, ctx, filtering, creating, onCreating: () => setCreating(false) };
  return (
    <div data-tabs="user-group">
      <div className="d-flex align-items-start gap-2 mb-3">
        <TabStrip
          tabs={TABS.map(tab => ({ key: tab.key, label: t(tab.labelKey) }))}
          active={active}
          onSelect={select}
          className="flex-grow-1"
        />
        {Create ? <Create onClick={() => setCreating(true)} /> : null}
      </div>
      {active === 'users' ? (
        <UserSection
          {...shared}
          table={tables.users}
          reading={readings.users}
          groups={namesOf(rows.groups, 'groupname')}
          roles={namesOf(rows.roles, 'rolename')}
        />
      ) : null}
      {active === 'groups' ? (
        <GroupSection {...shared} table={tables.groups} reading={readings.groups} />
      ) : null}
      {active === 'roles' ? (
        <RoleSection {...shared} table={tables.roles} reading={readings.roles} />
      ) : null}
      {active === 'rbac' ? (
        <RBACDiscoverySection
          hostname={hostname}
          ctx={ctx}
          tables={{
            authorizations: tables.authorizations,
            profiles: tables.profiles,
            roles: tables.rbacRoles,
          }}
          readings={{
            authorizations: readings.authorizations,
            profiles: readings.profiles,
            roles: readings.rbacRoles,
          }}
          filtering={filtering}
        />
      ) : null}
    </div>
  );
};

UserGroupManagement.propTypes = {
  id: PropTypes.string.isRequired,
  hostname: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  tables: PropTypes.object.isRequired,
  readings: PropTypes.object.isRequired,
  rows: PropTypes.shape({
    groups: PropTypes.array.isRequired,
    roles: PropTypes.array.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
};

export default UserGroupManagement;
