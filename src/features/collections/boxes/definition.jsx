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
} from '../../catalog/components/columns';
import { architectureNames, providerNames } from '../../catalog/utils/itemShape';

import { boxesAdapter } from './adapter';
import { BoxQuickActions } from './deploy';
import { canManageBox } from './permissions';
import {
  BoxCicdBar,
  BoxItemActions,
  BoxItemExtras,
  BoxVersionRowActions,
  BoxVersionsActions,
} from './slots/BoxItem';
import { BoxListActions } from './slots/BoxList';
import {
  BoxArchitectureRowActions,
  BoxArchitecturesActions,
  BoxProviderActions,
} from './slots/BoxProvider';
import {
  BoxProviderRowActions,
  BoxProvidersActions,
  BoxVersionActions,
  BoxVersionBannerActions,
  BoxVersionNotesActions,
} from './slots/BoxVersion';

export const boxes = {
  key: 'boxes',
  labelKey: 'collections.boxes',
  countKey: 'collections.boxesCount',
  icon: <FaCube aria-hidden />,
  segment: '',
  hasVersions: true,
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
  slots: {
    ListActions: BoxListActions,
    ItemQuickActions: BoxQuickActions,
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
