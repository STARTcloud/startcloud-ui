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

const FAMILY_GROUP = 'downloads:family:';

/**
 * The listing's groups by family: one per family name in the order the
 * items first name them, each carrying the family's description from the
 * first item that names it, then, last and only while such items exist,
 * one group of the items without a family.
 *
 * @param {Array<Object>} items - The listing's items
 * @param {Function} t - The translator
 * @returns {Array<Object>} The groups
 */
const groupsByFamily = (items, t) => {
  const groups = new Map();
  const other = [];
  items.forEach(item => {
    if (!item.family) {
      other.push(item);
      return;
    }
    if (!groups.has(item.family)) {
      groups.set(item.family, {
        key: `${FAMILY_GROUP}${item.family}`,
        label: item.family,
        description: item.familyDetails?.description || '',
        items: [],
      });
    }
    groups.get(item.family).items.push(item);
  });
  if (other.length > 0) {
    groups.set('', { key: FAMILY_GROUP, label: t('pages.group.other'), items: other });
  }
  return [...groups.values()];
};

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
  defaultSort: [{ column: 'name', direction: 'asc' }],
  groupsOf: groupsByFamily,
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
