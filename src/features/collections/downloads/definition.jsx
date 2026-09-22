import { FaDownload } from 'react-icons/fa6';

import {
  createdColumn,
  downloadsColumn,
  familyColumn,
  nameColumn,
  platformsColumn,
  releasedColumn,
  releasesColumn,
  statusColumn,
  updatedColumn,
  vendorColumn,
  visibilityColumn,
} from '../../../components/common/columns';
import {
  fileLevelColumns,
  patchLevelColumns,
  releaseLevelColumns,
} from '../../../components/common/levelColumns';
import { listWord } from '../../../utils/closedLists';
import { fileKinds, platformNames } from '../../../utils/itemShape';
import { isOrgManager } from '../../../utils/permissions';
import {
  DOWNLOAD_FILE_BULK,
  DOWNLOAD_ITEM_BULK,
  DOWNLOAD_PATCH_BULK,
  DOWNLOAD_RELEASE_BULK,
} from '../bulkActions';

import { downloadsAdapter } from './api/adapter';
import { DownloadBulkDialog } from './components/BulkDialogs';
import {
  DownloadItemActions,
  DownloadItemHeaderExtra,
  DownloadListActions,
  DownloadVersionsActions,
} from './components/Download';
import {
  DownloadArchitectureRowActions,
  DownloadArchitecturesActions,
  DownloadProviderActions,
} from './components/DownloadPatch';
import {
  DownloadProviderRowActions,
  DownloadProvidersActions,
  DownloadVersionActions,
  DownloadVersionRowActions,
} from './components/DownloadRelease';

export const downloads = {
  key: 'downloads',
  labelKey: 'collections.downloads',
  countKey: 'collections.downloadsCount',
  icon: FaDownload,
  segment: 'downloads',
  hasVersions: true,
  hasProviders: true,
  leafIsFile: true,
  itemRoute: true,
  searchKey: 'downloads.search',
  defaultView: 'cards',
  adapter: downloadsAdapter,
  canManage: (item, user) => isOrgManager(user, item.organization.name),
  filterGroups: [
    {
      key: 'family',
      labelKey: 'pages.filter.family',
      values: item => (item.family ? [item.family] : []),
      activeClass: 'bg-primary',
    },
    {
      key: 'vendor',
      labelKey: 'pages.filter.vendor',
      values: item => (item.vendor ? [item.vendor] : []),
      activeClass: 'bg-secondary',
    },
    {
      key: 'platform',
      labelKey: 'pages.filter.platform',
      values: platformNames,
      activeClass: 'bg-info',
      labelFor: (value, t) => listWord(t, 'platform', value),
    },
    {
      key: 'kind',
      labelKey: 'pages.filter.kind',
      values: fileKinds,
      activeClass: 'bg-success',
      labelFor: (value, t) => listWord(t, 'kind', value),
    },
  ],
  columns: [
    nameColumn,
    visibilityColumn,
    createdColumn,
    updatedColumn,
    downloadsColumn,
    statusColumn,
    familyColumn,
    vendorColumn,
    releasedColumn,
    releasesColumn,
    platformsColumn,
  ],
  levels: {
    versions: {
      labelKey: 'pages.table.releases',
      countKey: 'pages.table.releasesCount',
      columns: releaseLevelColumns,
    },
    providers: { labelKey: 'pages.table.patches', columns: patchLevelColumns },
    architectures: { labelKey: 'pages.table.files', columns: fileLevelColumns },
  },
  bulk: {
    items: DOWNLOAD_ITEM_BULK,
    versions: DOWNLOAD_RELEASE_BULK,
    providers: DOWNLOAD_PATCH_BULK,
    architectures: DOWNLOAD_FILE_BULK,
  },
  slots: {
    BulkDialog: DownloadBulkDialog,
    ListActions: DownloadListActions,
    ItemActions: DownloadItemActions,
    ItemHeaderExtra: DownloadItemHeaderExtra,
    VersionsActions: DownloadVersionsActions,
    VersionRowActions: DownloadVersionRowActions,
    VersionActions: DownloadVersionActions,
    ProvidersActions: DownloadProvidersActions,
    ProviderRowActions: DownloadProviderRowActions,
    ProviderActions: DownloadProviderActions,
    ArchitecturesActions: DownloadArchitecturesActions,
    ArchitectureRowActions: DownloadArchitectureRowActions,
  },
};
