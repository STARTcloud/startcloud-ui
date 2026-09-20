import { FaCube } from 'react-icons/fa6';

import {
  architecturesColumn,
  createdColumn,
  downloadsColumn,
  nameColumn,
  osColumn,
  providersColumn,
  releasedColumn,
  statusColumn,
  updatedColumn,
  versionsColumn,
  visibilityColumn,
} from '../../../components/common/columns';
import {
  architectureLevelColumns,
  providerLevelColumns,
  versionLevelColumns,
} from '../../../components/common/levelColumns';
import { architectureNames, providerNames } from '../../../utils/itemShape';
import { canManageBox } from '../../../utils/permissions';
import { ROW_BULK, VERSION_BULK } from '../bulkActions';

import { boxesAdapter } from './api/adapter';
import {
  BoxCicdBar,
  BoxItemActions,
  BoxItemExtras,
  BoxVersionRowActions,
  BoxVersionsActions,
} from './components/BoxItem';
import { BoxListActions } from './components/BoxList';
import {
  BoxArchitectureRowActions,
  BoxArchitecturesActions,
  BoxProviderActions,
} from './components/BoxProvider';
import {
  BoxProviderRowActions,
  BoxProvidersActions,
  BoxVersionActions,
  BoxVersionBannerActions,
  BoxVersionNotesActions,
} from './components/BoxVersion';
import { CardGlyph, deployColumn } from './components/deploy';

export const boxes = {
  key: 'boxes',
  labelKey: 'collections.boxes',
  countKey: 'collections.boxesCount',
  icon: FaCube,
  segment: '',
  hasVersions: true,
  hasProviders: true,
  itemRoute: true,
  searchKey: 'boxes.search.boxes',
  defaultView: 'table',
  adapter: boxesAdapter,
  canManage: (item, user) => canManageBox(user, item.organization.name, item.extras.raw),
  filterGroups: [
    {
      key: 'provider',
      labelKey: 'pages.filter.provider',
      values: providerNames,
      activeClass: 'bg-primary',
    },
    {
      key: 'architecture',
      labelKey: 'pages.filter.architecture',
      values: architectureNames,
      activeClass: 'bg-info',
    },
    {
      key: 'os',
      labelKey: 'pages.table.os',
      values: item => (item.metadata?.distro ? [item.metadata.distro] : []),
      activeClass: 'bg-success',
    },
  ],
  columns: [
    nameColumn,
    deployColumn,
    visibilityColumn,
    createdColumn,
    updatedColumn,
    downloadsColumn,
    statusColumn,
    osColumn,
    releasedColumn,
    versionsColumn,
    providersColumn,
    architecturesColumn,
  ],
  levels: {
    versions: { labelKey: 'pages.item.versions', columns: versionLevelColumns },
    providers: { labelKey: 'pages.table.providers', columns: providerLevelColumns },
    architectures: { labelKey: 'pages.table.architectures', columns: architectureLevelColumns },
  },
  bulk: {
    items: ROW_BULK,
    versions: VERSION_BULK,
    providers: ROW_BULK,
    architectures: ROW_BULK,
  },
  slots: {
    ListActions: BoxListActions,
    CardGlyph,
    ItemActions: BoxItemActions,
    ItemHeaderExtra: BoxCicdBar,
    ItemExtras: BoxItemExtras,
    VersionsActions: BoxVersionsActions,
    VersionRowActions: BoxVersionRowActions,
    VersionActions: BoxVersionActions,
    VersionBannerActions: BoxVersionBannerActions,
    VersionNotesActions: BoxVersionNotesActions,
    ProvidersActions: BoxProvidersActions,
    ProviderRowActions: BoxProviderRowActions,
    ProviderActions: BoxProviderActions,
    ArchitecturesActions: BoxArchitecturesActions,
    ArchitectureRowActions: BoxArchitectureRowActions,
  },
};
