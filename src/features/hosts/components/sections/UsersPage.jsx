import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { pageContextShape } from '../../../../utils/itemShape';
import { useHostManageData } from '../../hooks/useHostManageData';
import { manageParamGroups, tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { hostHasHypervisor } from '../../utils/capabilities';
import { matchesGroup, matchesRbac, matchesRole, matchesUser } from '../../utils/manage';
import { GROUP_COLUMNS, GROUP_FILTERS } from '../GroupTable';
import { AUTHORIZATION_COLUMNS } from '../RBAC/AuthorizationsTab';
import { PROFILE_COLUMNS } from '../RBAC/ProfilesTab';
import { RBAC_ROLE_COLUMNS } from '../RBAC/RolesTab';
import RefreshButton from '../RefreshButton';
import { ROLE_COLUMNS } from '../RoleTable';
import SectionPane from '../SectionPane';
import UserGroupManagement from '../UserGroupManagement';
import { USER_COLUMNS, USER_FILTERS } from '../UserTable';

const READS = ['users', 'groups', 'roles', 'authorizations', 'profiles', 'rbacRoles'];

const NO_NAMES = [];

/**
 * The Users and groups page of a host: the heading counting the users
 * the search leaves, Refresh in its pane, and `UserGroupManagement`
 * under it, the users, groups, roles and the three RBAC lists read once
 * for this page, their request filters in the navbar's panel.
 */
const UsersPage = ({ id, server, context, section, host, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const data = useHostManageData({ id, server, only: READS });
  const groups = manageParamGroups({
    params: data.params,
    setParam: data.setParam,
    resetParams: data.resetParams,
    zones: NO_NAMES,
    users: NO_NAMES,
    bhyve: hostHasHypervisor(server, 'bhyve'),
    t,
  });
  const ctx = { ...context, t, language: i18n.language, id, server };
  const search = useHostManageSearch({
    section,
    tables: {
      users: tableOf({
        key: 'users',
        labelKey: 'host.userGroupManagement.users',
        rows: data.rows.users,
        columns: USER_COLUMNS,
        matches: matchesUser,
        filterGroups: USER_FILTERS,
        paramGroups: groups.users,
        sort: 'username',
        offered: true,
      }),
      groups: tableOf({
        key: 'groups',
        labelKey: 'host.userGroupManagement.groups',
        rows: data.rows.groups,
        columns: GROUP_COLUMNS,
        matches: matchesGroup,
        filterGroups: GROUP_FILTERS,
        paramGroups: groups.groups,
        sort: 'groupname',
        offered: true,
      }),
      roles: tableOf({
        key: 'roles',
        labelKey: 'host.userGroupManagement.roles',
        rows: data.rows.roles,
        columns: ROLE_COLUMNS,
        matches: matchesRole,
        paramGroups: groups.roles,
        sort: 'rolename',
        offered: true,
      }),
      authorizations: tableOf({
        key: 'authorizations',
        labelKey: 'hostTools.DiscoverySection.tabAuthorizationsLabel',
        rows: data.rows.authorizations,
        columns: AUTHORIZATION_COLUMNS,
        matches: matchesRbac,
        paramGroups: groups.authorizations,
        sort: 'name',
        offered: true,
      }),
      profiles: tableOf({
        key: 'profiles',
        labelKey: 'hostTools.DiscoverySection.tabProfilesLabel',
        rows: data.rows.profiles,
        columns: PROFILE_COLUMNS,
        matches: matchesRbac,
        paramGroups: groups.profiles,
        sort: 'name',
        offered: true,
      }),
      rbacRoles: tableOf({
        key: 'rbac-roles',
        labelKey: 'hostTools.DiscoverySection.tabRolesLabel',
        rows: data.rows.rbacRoles,
        columns: RBAC_ROLE_COLUMNS,
        matches: matchesRbac,
        sort: 'name',
        offered: true,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'hosts.manage.search',
  });

  return (
    <SectionPane
      section={section}
      server={server}
      count={search.tables.users.rows.length}
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      <UserGroupManagement
        id={id}
        hostname={host.hostname}
        ctx={ctx}
        tables={{ ...search.tables, rbacRoles: search.tables['rbac-roles'] }}
        readings={data.reads}
        rows={data.rows}
        filtering={search.filtering}
      />
    </SectionPane>
  );
};

UsersPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  host: PropTypes.shape({ hostname: PropTypes.string.isRequired }).isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default UsersPage;
