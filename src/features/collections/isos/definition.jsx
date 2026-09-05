import { FaCompactDisc } from 'react-icons/fa6';

import {
  checksumColumn,
  createdColumn,
  downloadsColumn,
  nameColumn,
  sizeColumn,
  statusColumn,
  updatedColumn,
  visibilityColumn,
} from '../../catalog/components/columns';

import { isosAdapter } from './adapter';
import { IsoItemActions, IsoListActions } from './slots/Iso';

export const isos = {
  key: 'isos',
  labelKey: 'collections.isos',
  countKey: 'collections.isosCount',
  icon: <FaCompactDisc aria-hidden />,
  segment: 'isos',
  hasVersions: false,
  itemRoute: true,
  searchKey: 'boxes.search.isos',
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
  columns: [
    nameColumn,
    visibilityColumn,
    createdColumn,
    updatedColumn,
    downloadsColumn,
    statusColumn,
    sizeColumn,
    checksumColumn,
  ],
  slots: { ListActions: IsoListActions, ItemActions: IsoItemActions },
};
