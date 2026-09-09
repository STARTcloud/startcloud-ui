import { FaCompactDisc } from 'react-icons/fa6';

import {
  architecturesColumn,
  createdColumn,
  downloadsColumn,
  nameColumn,
  osColumn,
  releasedColumn,
  statusColumn,
  updatedColumn,
  versionsColumn,
  visibilityColumn,
} from '../../../components/common/columns';
import { architectureNames } from '../../../utils/itemShape';
import { isOrgManager } from '../../../utils/permissions';

import { isosAdapter } from './api/adapter';
import {
  IsoItemActions,
  IsoListActions,
  IsoVersionRowActions,
  IsoVersionsActions,
} from './components/Iso';
import {
  IsoArtifactRowActions,
  IsoArtifactsActions,
  IsoVersionActions,
  IsoVersionBannerActions,
  IsoVersionNotesActions,
} from './components/IsoVersion';

export const isos = {
  key: 'isos',
  labelKey: 'collections.isos',
  countKey: 'collections.isosCount',
  icon: <FaCompactDisc aria-hidden />,
  segment: 'isos',
  hasVersions: true,
  hasProviders: false,
  itemRoute: true,
  searchKey: 'boxes.search.isos',
  defaultView: 'table',
  adapter: isosAdapter,
  canManage: (item, user) => isOrgManager(user, item.organization.name),
  filterGroups: [
    {
      key: 'organization',
      labelKey: 'pages.table.organization',
      values: item => [item.organization.name],
      activeClass: 'bg-primary',
      homeOnly: true,
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
    architecturesColumn,
  ],
  slots: {
    ListActions: IsoListActions,
    ItemActions: IsoItemActions,
    VersionsActions: IsoVersionsActions,
    VersionRowActions: IsoVersionRowActions,
    VersionActions: IsoVersionActions,
    VersionBannerActions: IsoVersionBannerActions,
    VersionNotesActions: IsoVersionNotesActions,
    ArtifactsActions: IsoArtifactsActions,
    ArtifactRowActions: IsoArtifactRowActions,
  },
};
