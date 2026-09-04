import { FaCompactDisc, FaCube } from 'react-icons/fa6';

import {
  architectureNames,
  architecturesColumn,
  checksumColumn,
  createdColumn,
  downloadsColumn,
  nameColumn,
  osColumn,
  providerNames,
  providersColumn,
  releasedColumn,
  sizeColumn,
  statusColumn,
  updatedColumn,
  versionsColumn,
  visibilityColumn,
} from '../../pages';

import { boxesAdapter, isosAdapter } from './adapter';
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
import { IsoItemActions, IsoListActions } from './slots/Iso';

const sharedColumns = [nameColumn, visibilityColumn, createdColumn, updatedColumn, downloadsColumn];

export const boxes = {
  key: 'boxes',
  labelKey: 'collections.boxes',
  countKey: 'collections.boxesCount',
  icon: <FaCube aria-hidden />,
  segment: '',
  hasVersions: true,
  itemRoute: true,
  searchKey: 'search.boxes',
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
    ...sharedColumns,
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

export const isos = {
  key: 'isos',
  labelKey: 'collections.isos',
  countKey: 'collections.isosCount',
  icon: <FaCompactDisc aria-hidden />,
  segment: 'isos',
  hasVersions: false,
  itemRoute: true,
  searchKey: 'search.isos',
  defaultView: 'table',
  adapter: isosAdapter,
  filterGroups: [
    {
      key: 'organization',
      labelKey: 'pages.table.organization',
      values: item => [item.organization.name],
      activeClass: 'bg-primary',
      homeOnly: true,
    },
  ],
  columns: [...sharedColumns, statusColumn, sizeColumn, checksumColumn],
  slots: { ListActions: IsoListActions, ItemActions: IsoItemActions },
};

export const collections = [boxes, isos];
