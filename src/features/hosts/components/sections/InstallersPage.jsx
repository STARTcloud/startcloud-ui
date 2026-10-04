import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { pageContextShape } from '../../../../utils/itemShape';
import { artifactParamGroups, useArtifactStorageData } from '../../hooks/useArtifactStorage';
import { tableOf, useHostManageSearch } from '../../hooks/useHostManageSearch';
import { catalogParamGroups, useManageCatalogData } from '../../hooks/useManageCatalogData';
import { matchesArtifact, matchesStoragePath } from '../../utils/artifacts';
import { matchesArtifact as matchesInstaller } from '../../utils/manageCatalog';
import {
  ARTIFACT_COLUMNS as INSTALLER_COLUMNS,
  ARTIFACT_FILTERS as INSTALLER_FILTERS,
} from '../ArtifactColumns';
import { ARTIFACT_COLUMNS, ARTIFACT_FILTERS } from '../ArtifactStorage/ArtifactRow';
import { STORAGE_PATH_COLUMNS, STORAGE_PATH_FILTERS } from '../ArtifactStorage/StoragePathTable';
import ArtifactStorageSection from '../ArtifactStorageSection';
import InstallerFilesSection from '../InstallerFilesSection';
import RefreshButton from '../RefreshButton';
import SectionPane from '../SectionPane';

/**
 * The Installer files page of a host: the heading counting the installer
 * files the search leaves, Refresh in its pane, and under it
 * `ArtifactStorageSection` while the host lists `artifacts` and
 * `InstallerFilesSection` while it lists `artifacts` and
 * `provisioner-registry`, the storage locations, artifacts and installer
 * files read once for this page, their request filters in the navbar's
 * panel.
 */
const InstallersPage = ({ id, server, context, section, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const artifacts = useArtifactStorageData({ id, server });
  const catalog = useManageCatalogData({ id, server, only: ['installers'] });
  const groups = catalogParamGroups({
    params: catalog.params,
    setParam: catalog.setParam,
    resetParams: catalog.resetParams,
    locations: catalog.rows.locations,
    t,
  });
  const ctx = { ...context, t, language: i18n.language, id, server };
  const search = useHostManageSearch({
    section,
    tables: {
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
      installers: tableOf({
        key: 'installers',
        labelKey: 'pages.hostManage.tabInstallerFiles',
        rows: catalog.rows.installers,
        columns: INSTALLER_COLUMNS,
        matches: matchesInstaller,
        filterGroups: INSTALLER_FILTERS,
        paramGroups: groups.installers,
        sort: 'filename',
        offered: catalog.gates.installers,
      }),
    },
    ctx,
    prefsPrefix: context.prefsPrefix,
    placeholderKey: 'hosts.manage.search',
  });
  const tables = {
    storagePaths: search.tables['storage-paths'],
    artifacts: search.tables.artifacts,
  };

  return (
    <SectionPane
      section={section}
      server={server}
      count={catalog.gates.installers ? search.tables.installers.rows.length : null}
      actions={<RefreshButton onRefresh={onRefresh} />}
    >
      {artifacts.offered ? (
        <ArtifactStorageSection
          id={id}
          server={server}
          ctx={ctx}
          data={artifacts}
          search={tables}
          filtering={search.filtering}
        />
      ) : null}
      {catalog.gates.installers ? (
        <InstallerFilesSection
          id={id}
          server={server}
          ctx={ctx}
          table={search.tables.installers}
          reads={catalog.reads}
          rows={catalog.rows}
          params={catalog.params}
          setParam={catalog.setParam}
          filtering={search.filtering}
        />
      ) : null}
    </SectionPane>
  );
};

InstallersPage.propTypes = {
  id: PropTypes.string.isRequired,
  server: PropTypes.object.isRequired,
  context: pageContextShape.isRequired,
  section: PropTypes.string.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

export default InstallersPage;
