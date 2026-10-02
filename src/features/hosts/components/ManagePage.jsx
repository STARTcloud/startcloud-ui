import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import NotAvailableStub from '../../../components/common/NotAvailableStub';
import PageHeader from '../../../components/common/PageHeader';
import { useStatus } from '../../../contexts/StatusContext';
import { useFolds } from '../../../hooks/useFolds';
import { pageContextShape } from '../../../utils/itemShape';
import { artifactParamGroups, useArtifactStorageData } from '../hooks/useArtifactStorage';
import { useHostMachines } from '../hooks/useHostMachines';
import { ManageRefreshContext } from '../hooks/useHostManage';
import { useHostManageData } from '../hooks/useHostManageData';
import { manageParamGroups, useHostManageSearch } from '../hooks/useHostManageSearch';
import { useHostRow } from '../hooks/useHostRow';
import { useHostStats } from '../hooks/useHostStats';
import { catalogParamGroups, useManageCatalogData } from '../hooks/useManageCatalogData';
import { sectionParamGroups, useManageSectionsData } from '../hooks/useManageSectionsData';
import { useServers } from '../hooks/useServers';
import { matchesArtifact, matchesStoragePath } from '../utils/artifacts';
import { BOOT_ENVIRONMENT_FILTERS, matchesBootEnvironment } from '../utils/bootEnvironments';
import { hostHasFeature, hostHasHypervisor } from '../utils/capabilities';
import { matchesDatabase } from '../utils/database';
import {
  FAULT_FILTERS,
  MODULE_FILTERS,
  matchesFault,
  matchesFaultModule,
} from '../utils/FaultUtils';
import { hostLabel, isServerRole } from '../utils/hosts';
import { matchesLogFile } from '../utils/logs';
import {
  MANAGE_TOKENS,
  hostHasManage,
  matchesGroup,
  matchesHistory,
  matchesPeer,
  matchesProcess,
  matchesRbac,
  matchesRole,
  matchesService,
  matchesUser,
  offeredSections,
} from '../utils/manage';
import {
  matchesArtifact as matchesInstaller,
  matchesPackage,
  matchesProvisioner,
  matchesRecipe,
  matchesTemplate,
} from '../utils/manageCatalog';
import { canControlHosts } from '../utils/permissions';
import { REPOSITORY_FILTERS, matchesRepository } from '../utils/repositories';
import { SYSLOG_RULE_FILTERS, matchesSyslogRule } from '../utils/syslogUtils';

import {
  ARTIFACT_COLUMNS as INSTALLER_COLUMNS,
  ARTIFACT_FILTERS as INSTALLER_FILTERS,
} from './ArtifactColumns';
import { ARTIFACT_COLUMNS, ARTIFACT_FILTERS } from './ArtifactStorage/ArtifactRow';
import { STORAGE_PATH_COLUMNS, STORAGE_PATH_FILTERS } from './ArtifactStorage/StoragePathTable';
import ArtifactStorageSection from './ArtifactStorageSection';
import { CreateBootEnvironmentButton } from './BootEnvironmentsSection';
import { BOOT_ENVIRONMENT_COLUMNS } from './BootEnvironmentTable';
import { DATABASE_COLUMNS } from './DatabasePanel';
import { MODULE_COLUMNS } from './FaultManagerConfig';
import { FAULT_COLUMNS } from './FaultTable';
import FileManagerSection from './FileManagerSection';
import { GROUP_COLUMNS, GROUP_FILTERS } from './GroupTable';
import HostTabs from './HostTabs';
import InstallerFilesSection from './InstallerFilesSection';
import ManageOwnSections from './ManageOwnSections';
import ManageSection from './ManageSection';
import OrchestrationPanel from './OrchestrationPanel';
import { PACKAGE_COLUMNS, PACKAGE_FILTERS } from './PackageColumns';
import PackagesSection from './PackagesSection';
import ProcessManagement, { BatchKillButton } from './ProcessManagement';
import { PROCESS_COLUMNS } from './ProcessTable';
import ProvisionerSection, { PROVISIONER_COLUMNS } from './ProvisionerSection';
import ProvisioningNetworkPanel from './ProvisioningNetworkPanel';
import { AUTHORIZATION_COLUMNS } from './RBAC/AuthorizationsTab';
import { PROFILE_COLUMNS } from './RBAC/ProfilesTab';
import { RBAC_ROLE_COLUMNS } from './RBAC/RolesTab';
import RecipesSection, { RECIPE_COLUMNS } from './RecipesSection';
import RefreshButton from './RefreshButton';
import { AddRepositoryButton } from './RepositoriesSection';
import { REPOSITORY_COLUMNS } from './RepositoryTable';
import { ROLE_COLUMNS } from './RoleTable';
import RunlevelSection from './RunlevelSection';
import ServiceManagement from './ServiceManagement';
import { SERVICE_COLUMNS, SERVICE_FILTERS } from './ServiceTable';
import { SYSLOG_RULE_COLUMNS } from './SyslogConfiguration/CurrentRulesView';
import { LOG_FILE_COLUMNS, LOG_FILE_FILTERS } from './SystemLogs/LogFileExplorer';
import SystemUpdatesSection, { HISTORY_COLUMNS, HISTORY_FILTERS } from './SystemUpdatesSection';
import TemplatesSection, { TEMPLATE_COLUMNS, TEMPLATE_FILTERS } from './TemplatesSection';
import TimeNTPManagement from './TimeNTPManagement';
import { PEER_COLUMNS } from './TimeSync/PeerTable';
import UserGroupManagement from './UserGroupManagement';
import { USER_COLUMNS, USER_FILTERS } from './UserTable';

const TOKEN_LABEL = MANAGE_TOKENS.join(' / ');

const NAME_SORT = column => [{ column, direction: 'asc' }];

const NO_FILTERS = [];

const labelOf = ({ status, server, id, stats }) => {
  if (isServerRole(status)) {
    return server ? hostLabel(server) : String(id);
  }
  return stats?.hostname || String(id);
};

const namesOf = rows => [...new Set(rows.map(row => row.username).filter(Boolean))].sort();

const tableOf = ({
  key,
  labelKey,
  rows,
  columns,
  matches,
  filterGroups,
  paramGroups,
  sort,
  offered,
}) => ({
  key,
  labelKey,
  rows,
  columns,
  matches,
  filterGroups: filterGroups || NO_FILTERS,
  paramGroups,
  defaultSort: NAME_SORT(sort),
  offered,
});

const foldOf = ({ folds, key, t }) => {
  const folded = folds.folded(key);
  return {
    folded,
    onFold: () => folds.toggle(key),
    title: t(folded ? 'hosts.manage.expand' : 'hosts.manage.collapse'),
  };
};

const CatalogBody = ({ section, id, server, ctx, search, catalog }) => {
  switch (section.key) {
    case 'packages':
      return (
        <PackagesSection
          id={id}
          ctx={ctx}
          table={search.packages}
          reading={catalog.reads.packages}
          params={catalog.params}
          setParam={catalog.setParam}
          filtering={search.filtering}
        />
      );
    case 'installer-files':
      return (
        <InstallerFilesSection
          id={id}
          server={server}
          ctx={ctx}
          table={search.installers}
          reads={catalog.reads}
          rows={catalog.rows}
          params={catalog.params}
          setParam={catalog.setParam}
          filtering={search.filtering}
        />
      );
    case 'recipes':
      return (
        <RecipesSection
          id={id}
          ctx={ctx}
          table={search.recipes}
          reading={catalog.reads.recipes}
          filtering={search.filtering}
        />
      );
    case 'templates':
      return (
        <TemplatesSection
          id={id}
          server={server}
          ctx={ctx}
          table={search.templates}
          reads={catalog.reads}
          rows={catalog.rows}
          filtering={search.filtering}
        />
      );
    case 'provisioning':
      return (
        <ProvisionerSection
          id={id}
          server={server}
          ctx={ctx}
          table={search.provisioners}
          reads={catalog.reads}
          rows={catalog.rows}
          filtering={search.filtering}
        />
      );
    case 'provisioning-network':
      return <ProvisioningNetworkPanel id={id} ctx={ctx} />;
    default:
      return null;
  }
};

CatalogBody.propTypes = {
  section: PropTypes.shape({ key: PropTypes.string.isRequired }).isRequired,
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
  search: PropTypes.object.isRequired,
  catalog: PropTypes.object.isRequired,
};

const SectionBody = ({
  section,
  id,
  server,
  hostname,
  ctx,
  data,
  search,
  batch,
  onBatch,
  artifacts,
  sections,
  catalog,
  creating,
  onCreating,
}) => {
  const { reads, rows } = data;
  switch (section.key) {
    case 'packages':
    case 'installer-files':
    case 'recipes':
    case 'templates':
    case 'provisioning':
    case 'provisioning-network':
      return (
        <CatalogBody
          section={section}
          id={id}
          server={server}
          ctx={ctx}
          search={search}
          catalog={catalog}
        />
      );
    case 'file-manager':
      return <FileManagerSection id={id} ctx={ctx} />;
    case 'artifacts':
      return (
        <ArtifactStorageSection
          id={id}
          server={server}
          ctx={ctx}
          data={artifacts}
          search={search}
          filtering={search.filtering}
        />
      );
    case 'services':
      return (
        <ServiceManagement
          id={id}
          ctx={ctx}
          table={search.services}
          reading={reads.services}
          filtering={search.filtering}
        />
      );
    case 'system-updates':
      return (
        <SystemUpdatesSection
          id={id}
          ctx={ctx}
          table={search.history}
          reading={reads.history}
          filtering={search.filtering}
        />
      );
    case 'time-ntp':
      return (
        <TimeNTPManagement
          id={id}
          hostname={hostname}
          ctx={ctx}
          table={search.peers}
          reading={reads.timeSync}
          filtering={search.filtering}
        />
      );
    case 'processes':
      return (
        <ProcessManagement
          id={id}
          server={server}
          ctx={ctx}
          table={search.processes}
          reading={reads.processes}
          filtering={search.filtering}
          zones={ctx.zones}
          batch={batch}
          onBatch={onBatch}
        />
      );
    case 'user-group':
      return (
        <UserGroupManagement
          id={id}
          hostname={hostname}
          ctx={ctx}
          tables={search}
          readings={reads}
          rows={rows}
          filtering={search.filtering}
        />
      );
    case 'orchestration':
      return <OrchestrationPanel id={id} />;
    case 'runlevel':
      return <RunlevelSection id={id} />;
    default:
      return (
        <ManageOwnSections
          section={section}
          id={id}
          ctx={ctx}
          search={search}
          sections={sections}
          creating={creating}
          onCreating={onCreating}
        />
      );
  }
};

SectionBody.propTypes = {
  section: PropTypes.shape({ key: PropTypes.string.isRequired }).isRequired,
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  hostname: PropTypes.string.isRequired,
  ctx: PropTypes.object.isRequired,
  data: PropTypes.object.isRequired,
  search: PropTypes.object.isRequired,
  batch: PropTypes.bool.isRequired,
  onBatch: PropTypes.func.isRequired,
  artifacts: PropTypes.object.isRequired,
  sections: PropTypes.object.isRequired,
  catalog: PropTypes.object.isRequired,
  creating: PropTypes.string,
  onCreating: PropTypes.func.isRequired,
};

const COUNTED = {
  services: 'services',
  processes: 'processes',
  'boot-environments': 'bootEnvironments',
  'fault-management': 'faults',
  repositories: 'repositories',
  packages: 'packages',
  'installer-files': 'installers',
  recipes: 'recipes',
  templates: 'templates',
  provisioning: 'provisioners',
};

const countOf = (section, search) =>
  COUNTED[section.key] ? search[COUNTED[section.key]].rows.length : null;

const actionsOf = ({ section, setBatch, setCreating }) => {
  switch (section.key) {
    case 'processes':
      return <BatchKillButton onClick={() => setBatch(true)} />;
    case 'boot-environments':
      return <CreateBootEnvironmentButton onClick={() => setCreating('boot-environments')} />;
    case 'repositories':
      return <AddRepositoryButton onClick={() => setCreating('repositories')} />;
    default:
      return null;
  }
};

/**
 * The Manage page of a host that offers it, the frame and the sections
 * in hyperweaver-ui's order: the heading with Refresh, the tab row of
 * the host's pages, and one folding glass section a tab of
 * hyperweaver-ui's `HostManage`, each behind the token it gated its tab
 * with, its sentence about the host under its heading. The system
 * group draws its body here, the services, the system updates, the
 * time and NTP, the processes, the users and groups, the orchestration
 * and the runlevel, with the file manager, the ISO and artifacts, the
 * repositories, the ARC configuration, the boot environments, the fault
 * management, the system logs, the syslog configuration, the database,
 * the packages, the installer files, the recipes, the templates, the
 * provisioners and the provisioning network beside them; every other
 * section draws its heading and its sentence until its sub-stage lands.
 * The ten tables of the system group, the two of the artifacts, the
 * seven of the other sections and the five of the catalog sections
 * are narrowed together by the page's one navbar binding, the
 * reads held once at the page, every fold kept under the page's
 * `table_prefs_manage`, and Refresh reads again the list of servers,
 * the host's stats and every read of the page and its sections.
 */
const ManageFrame = ({ id, server, context, presses, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const status = useStatus();
  const { refresh: refreshServers } = useServers();
  const { stats, refresh: refreshStats } = useHostStats(id);
  const listsMachines = hostHasFeature(server, 'machines');
  const { machines } = useHostMachines(id, listsMachines);
  const folds = useFolds(`${context.prefsPrefix}_manage`);
  const data = useHostManageData({ id, server });
  const artifacts = useArtifactStorageData({ id, server });
  const sections = useManageSectionsData({ id, server });
  const catalog = useManageCatalogData({ id, server });
  const [batch, setBatch] = useState(false);
  const [creating, setCreating] = useState(null);
  const sectionGroups = sectionParamGroups({
    params: sections.params,
    setParam: sections.setParam,
    resetParams: sections.resetParams,
    t,
  });
  const catalogGroups = catalogParamGroups({
    params: catalog.params,
    setParam: catalog.setParam,
    resetParams: catalog.resetParams,
    locations: catalog.rows.locations,
    t,
  });
  const zones = useMemo(
    () =>
      machines
        .map(machine => machine.name)
        .filter(Boolean)
        .sort(),
    [machines]
  );
  const users = useMemo(() => namesOf(data.rows.processes), [data.rows.processes]);
  const groups = manageParamGroups({
    params: data.params,
    setParam: data.setParam,
    resetParams: data.resetParams,
    zones,
    users,
    bhyve: hostHasHypervisor(server, 'bhyve'),
    t,
  });
  const ctx = {
    ...context,
    t,
    language: i18n.language,
    id,
    server,
    zones,
    detailed: data.params.processes.detailed,
  };
  const accounts = hostHasFeature(server, 'system-users');
  const search = useHostManageSearch({
    tables: {
      services: tableOf({
        key: 'services',
        labelKey: 'pages.hostManage.tabServices',
        rows: data.rows.services,
        columns: SERVICE_COLUMNS,
        matches: matchesService,
        filterGroups: SERVICE_FILTERS,
        paramGroups: groups.services,
        sort: 'service',
        offered: hostHasFeature(server, 'services'),
      }),
      processes: tableOf({
        key: 'processes',
        labelKey: 'pages.hostManage.tabProcesses',
        rows: data.rows.processes,
        columns: PROCESS_COLUMNS,
        matches: matchesProcess,
        paramGroups: groups.processes,
        sort: 'pid',
        offered: hostHasFeature(server, 'processes'),
      }),
      users: tableOf({
        key: 'users',
        labelKey: 'host.userGroupManagement.users',
        rows: data.rows.users,
        columns: USER_COLUMNS,
        matches: matchesUser,
        filterGroups: USER_FILTERS,
        paramGroups: groups.users,
        sort: 'username',
        offered: accounts,
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
        offered: accounts,
      }),
      roles: tableOf({
        key: 'roles',
        labelKey: 'host.userGroupManagement.roles',
        rows: data.rows.roles,
        columns: ROLE_COLUMNS,
        matches: matchesRole,
        paramGroups: groups.roles,
        sort: 'rolename',
        offered: accounts,
      }),
      authorizations: tableOf({
        key: 'authorizations',
        labelKey: 'hostTools.DiscoverySection.tabAuthorizationsLabel',
        rows: data.rows.authorizations,
        columns: AUTHORIZATION_COLUMNS,
        matches: matchesRbac,
        paramGroups: groups.authorizations,
        sort: 'name',
        offered: accounts,
      }),
      profiles: tableOf({
        key: 'profiles',
        labelKey: 'hostTools.DiscoverySection.tabProfilesLabel',
        rows: data.rows.profiles,
        columns: PROFILE_COLUMNS,
        matches: matchesRbac,
        paramGroups: groups.profiles,
        sort: 'name',
        offered: accounts,
      }),
      rbacRoles: tableOf({
        key: 'rbac-roles',
        labelKey: 'hostTools.DiscoverySection.tabRolesLabel',
        rows: data.rows.rbacRoles,
        columns: RBAC_ROLE_COLUMNS,
        matches: matchesRbac,
        sort: 'name',
        offered: accounts,
      }),
      peers: tableOf({
        key: 'peers',
        labelKey: 'hostTime.timeSyncPeerTable.columnServer',
        rows: data.rows.peers,
        columns: PEER_COLUMNS,
        matches: matchesPeer,
        sort: 'server',
        offered: hostHasFeature(server, 'time-sync'),
      }),
      history: tableOf({
        key: 'history',
        labelKey: 'host.systemUpdates.historyTitle',
        rows: data.rows.history,
        columns: HISTORY_COLUMNS,
        matches: matchesHistory,
        filterGroups: HISTORY_FILTERS,
        sort: 'date',
        offered: hostHasFeature(server, 'packages'),
      }),
      storagePaths: tableOf({
        key: 'storage-paths',
        labelKey: 'artifacts.artifactManagement.storageLocationsTab',
        rows: artifacts.rows.storagePaths,
        columns: STORAGE_PATH_COLUMNS,
        matches: matchesStoragePath,
        filterGroups: STORAGE_PATH_FILTERS,
        sort: 'name',
        offered: artifacts.offered,
      }),
      artifacts: tableOf({
        key: 'artifacts',
        labelKey: 'artifacts.artifactManagement.artifactsTab',
        rows: artifacts.rows.artifacts,
        columns: ARTIFACT_COLUMNS,
        matches: matchesArtifact,
        filterGroups: ARTIFACT_FILTERS,
        paramGroups: artifactParamGroups({
          params: artifacts.params,
          setParam: artifacts.setParam,
          resetParams: artifacts.resetParams,
          storagePaths: artifacts.rows.storagePaths,
          t,
        }),
        sort: 'filename',
        offered: artifacts.offered,
      }),
      syslogRules: tableOf({
        key: 'syslog-rules',
        labelKey: 'hostTime.syslogCurrentRules.heading',
        rows: sections.rows.syslogRules,
        columns: SYSLOG_RULE_COLUMNS,
        matches: matchesSyslogRule,
        filterGroups: SYSLOG_RULE_FILTERS,
        sort: 'line',
        offered: sections.offered.syslog,
      }),
      logFiles: tableOf({
        key: 'log-files',
        labelKey: 'host.logFileExplorer.logFiles',
        rows: sections.rows.logFiles,
        columns: LOG_FILE_COLUMNS,
        matches: matchesLogFile,
        filterGroups: LOG_FILE_FILTERS,
        sort: 'name',
        offered: sections.offered.logs,
      }),
      bootEnvironments: tableOf({
        key: 'boot-environments',
        labelKey: 'pages.hostManage.tabBootEnvironments',
        rows: sections.rows.bootEnvironments,
        columns: BOOT_ENVIRONMENT_COLUMNS,
        matches: matchesBootEnvironment,
        filterGroups: BOOT_ENVIRONMENT_FILTERS,
        paramGroups: sectionGroups.bootEnvironments,
        sort: 'name',
        offered: sections.offered.bootEnvironments,
      }),
      faults: tableOf({
        key: 'faults',
        labelKey: 'host.faultManagement.tabCurrentFaults',
        rows: sections.rows.faults,
        columns: FAULT_COLUMNS,
        matches: matchesFault,
        filterGroups: FAULT_FILTERS,
        paramGroups: sectionGroups.faults,
        sort: 'time',
        offered: sections.offered.faults,
      }),
      faultModules: tableOf({
        key: 'fault-modules',
        labelKey: 'host.faultManagerConfig.faultManagementModules',
        rows: sections.rows.faultModules,
        columns: MODULE_COLUMNS,
        matches: matchesFaultModule,
        filterGroups: MODULE_FILTERS,
        sort: 'module',
        offered: sections.offered.faults,
      }),
      databases: tableOf({
        key: 'databases',
        labelKey: 'pages.hostManage.tabDatabase',
        rows: sections.rows.databases,
        columns: DATABASE_COLUMNS,
        matches: matchesDatabase,
        sort: 'name',
        offered: sections.offered.database,
      }),
      repositories: tableOf({
        key: 'repositories',
        labelKey: 'host.packageManagement.repositories',
        rows: sections.rows.repositories,
        columns: REPOSITORY_COLUMNS,
        matches: matchesRepository,
        filterGroups: REPOSITORY_FILTERS,
        paramGroups: sectionGroups.repositories,
        sort: 'name',
        offered: sections.offered.repositories,
      }),
      packages: tableOf({
        key: 'packages',
        labelKey: 'pages.hostManage.tabPackages',
        rows: catalog.rows.packages,
        columns: PACKAGE_COLUMNS,
        matches: matchesPackage,
        filterGroups: PACKAGE_FILTERS,
        paramGroups: catalogGroups.packages,
        sort: 'name',
        offered: catalog.gates.packages,
      }),
      installers: tableOf({
        key: 'installers',
        labelKey: 'pages.hostManage.tabInstallerFiles',
        rows: catalog.rows.installers,
        columns: INSTALLER_COLUMNS,
        matches: matchesInstaller,
        filterGroups: INSTALLER_FILTERS,
        paramGroups: catalogGroups.installers,
        sort: 'filename',
        offered: catalog.gates.installers,
      }),
      recipes: tableOf({
        key: 'recipes',
        labelKey: 'pages.hostManage.tabRecipes',
        rows: catalog.rows.recipes,
        columns: RECIPE_COLUMNS,
        matches: matchesRecipe,
        paramGroups: catalogGroups.recipes,
        sort: 'name',
        offered: catalog.gates.recipes,
      }),
      templates: tableOf({
        key: 'templates',
        labelKey: 'pages.hostManage.tabTemplates',
        rows: catalog.rows.templates,
        columns: TEMPLATE_COLUMNS,
        matches: matchesTemplate,
        filterGroups: TEMPLATE_FILTERS,
        sort: 'box',
        offered: catalog.gates.templates,
      }),
      provisioners: tableOf({
        key: 'provisioners',
        labelKey: 'pages.hostManage.tabProvisioners',
        rows: catalog.rows.provisioners,
        columns: PROVISIONER_COLUMNS,
        matches: matchesProvisioner,
        sort: 'name',
        offered: catalog.gates.provisioners,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
  });
  const label = labelOf({ status, server, id, stats });
  const hostname = server.hostname || label;
  const title = t('pages.hostManage.pageTitle');

  useEffect(() => {
    document.title = t('pages.hostManage.titleManageHost', { hostname: label });
  }, [t, label]);

  const refresh = () => {
    refreshServers();
    refreshStats();
    onRefresh();
  };

  return (
    <div className="list row" data-page="manage" data-refreshes={presses}>
      <PageHeader title={title} subtitle={label} actions={<RefreshButton onRefresh={refresh} />} />
      <HostTabs id={id} />
      {offeredSections(server).map(section => (
        <ManageSection
          key={section.key}
          section={section}
          hostname={hostname}
          fold={foldOf({ folds, key: section.key, t })}
          count={countOf(section, search)}
          actions={actionsOf({ section, setBatch, setCreating })}
        >
          <SectionBody
            section={section}
            id={id}
            server={server}
            hostname={hostname}
            ctx={ctx}
            data={data}
            search={search}
            batch={batch}
            onBatch={() => setBatch(false)}
            artifacts={artifacts}
            sections={sections}
            catalog={catalog}
            creating={creating}
            onCreating={setCreating}
          />
        </ManageSection>
      ))}
    </div>
  );
};

ManageFrame.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  presses: PropTypes.number.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

/**
 * What the Manage route draws for a host the list of servers does not
 * hold, what the host page draws for such an id: the heading with the
 * id or the hostname the stats answered, and the danger alert when the
 * host's stats failed, the loading line until they answered.
 */
const UnknownHost = ({ id }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const { refresh: refreshServers } = useServers();
  const { stats, loaded, failed, refresh: refreshStats } = useHostStats(id);

  if (!loaded) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  const refresh = () => {
    refreshServers();
    refreshStats();
  };

  return (
    <div className="list row" data-page="manage-unknown">
      <PageHeader
        title={t('pages.hostManage.pageTitle')}
        subtitle={labelOf({ status, server: null, id, stats })}
        actions={<RefreshButton onRefresh={refresh} />}
      />
      {failed ? (
        <div className="alert alert-danger" role="alert">
          {t('hosts.host.loadError')}
        </div>
      ) : null}
    </div>
  );
};

UnknownHost.propTypes = {
  id: PropTypes.string.isRequired,
};

/**
 * The Manage page of one host at `/hosts/{id}/manage`, hyperweaver-ui's
 * host manage page: for an admin alone, hyperweaver-ui's gate, the
 * danger alert otherwise; behind any token of its sections,
 * hyperweaver-ui's `MANAGE_FEATURES`, checked strictly on the host's
 * own row, a host that lists none drawing the not-available stub and
 * nothing asked of it; an id the list of servers does not hold draws
 * what the host page draws for it. The page provides the count of its
 * Refresh presses to every read under it, so one press reads the whole
 * page again, and nothing reads on a clock.
 */
const ManagePage = ({ id, context }) => {
  const { t } = useTranslation();
  const { loaded: listed } = useServers();
  const server = useHostRow(id);
  const [presses, setPresses] = useState(0);

  if (!listed) {
    return (
      <div className="list row">
        <div>{t('pages.loading')}</div>
      </div>
    );
  }

  if (!server) {
    return <UnknownHost id={id} />;
  }

  if (!hostHasManage(server)) {
    return <NotAvailableStub title={t('pages.hostManage.pageTitle')} tokenLabel={TOKEN_LABEL} />;
  }

  if (!canControlHosts(context.user?.role)) {
    return (
      <div className="list row" data-page="manage-denied">
        <PageHeader title={t('pages.hostManage.pageTitle')} subtitle={hostLabel(server)} />
        <div className="alert alert-danger" role="alert" data-note="admin-required">
          {t('pages.hostManage.adminRequired')}
        </div>
      </div>
    );
  }

  return (
    <ManageRefreshContext.Provider value={presses}>
      <ManageFrame
        id={id}
        server={server}
        context={context}
        presses={presses}
        onRefresh={() => setPresses(current => current + 1)}
      />
    </ManageRefreshContext.Provider>
  );
};

ManagePage.propTypes = {
  id: PropTypes.string.isRequired,
  context: pageContextShape.isRequired,
};

export default ManagePage;
