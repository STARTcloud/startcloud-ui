import { Link } from 'react-router-dom';

import {
  VISIBILITY_GROUP,
  architectureNames,
  latestReleaseTime,
  platformNames,
  providerNames,
  visibilityOf,
} from '../../utils/itemShape';
import { formatRelativeTime } from '../../utils/relativeTime';
import { itemPath } from '../../utils/routes';
import { OrgLogo } from '../layout/OrgSwitcherModal';

import { VisibilityBadge } from './StatusChips';
import { hasAny } from './SubTable';

const localeDate = value => (value ? new Date(value).toLocaleDateString() : '');

const namesKey = names => names.join(' ').toLowerCase();

const itemIcon = icon =>
  icon ? (
    <img
      src={icon}
      alt=""
      className="rounded icon-with-margin-sm v-align-middle prov-icon-sm"
      loading="lazy"
      onError={event => {
        event.currentTarget.classList.add('d-none');
      }}
    />
  ) : null;

const nameBadges = names =>
  names.length > 0 ? (
    <span className="d-inline-flex flex-wrap gap-1">
      {names.map(name => (
        <span key={name} className="badge bg-secondary badge-xs">
          {name}
        </span>
      ))}
    </span>
  ) : (
    'N/A'
  );

export const nameColumn = {
  key: 'name',
  kind: 'name',
  labelKey: 'pages.table.name',
  sortValue: item => item.name.toLowerCase(),
  render: (item, ctx) => {
    const owner = item.vendor || item.organization.name;
    const text = `${owner}/${item.name}`;
    return (
      <>
        {item.icon ? (
          itemIcon(item.icon)
        ) : (
          <OrgLogo
            org={item.organization}
            size={30}
            className="rounded-circle avatar-lg icon-with-margin-sm v-align-middle"
            fallback={ctx.orgMark}
          />
        )}
        {ctx.collection.itemRoute ? (
          <Link
            to={itemPath(ctx.collection, item.organization.name, item.name)}
            className="v-align-middle"
            title={text}
          >
            {item.name}
          </Link>
        ) : (
          <span className="v-align-middle" title={text}>
            {item.name}
          </span>
        )}
      </>
    );
  },
};

export const labelColumn = {
  key: 'label',
  kind: 'name',
  labelKey: 'pages.table.name',
  sortValue: item => (item.label || item.name).toLowerCase(),
  render: (item, ctx) => (
    <>
      {itemIcon(item.icon)}
      <Link
        to={itemPath(ctx.collection, item.organization.name, item.name)}
        className="v-align-middle"
      >
        {item.label || item.name}
      </Link>
      {item.label && item.label !== item.name ? (
        <code className="checksum ms-2">{item.name}</code>
      ) : null}
    </>
  ),
};

export const osColumn = {
  key: 'os',
  kind: 'text',
  labelKey: 'pages.table.os',
  sortValue: item => (item.os?.label || '').toLowerCase(),
  render: item => {
    const label = item.os?.label || '';
    const iconUrl = item.os?.iconUrl || '';
    if (!label && !iconUrl) {
      return null;
    }
    return (
      <>
        {iconUrl ? (
          <img src={iconUrl} alt="" className="icon-with-margin-sm v-align-middle avatar-lg" />
        ) : null}
        <span className="v-align-middle">{label}</span>
      </>
    );
  },
};

export const statusColumn = {
  key: 'status',
  kind: 'badge',
  labelKey: 'pages.table.status',
  sortValue: item => (item.published ? 0 : 1),
  render: (item, ctx) => (
    <span className={`badge ${item.published ? 'bg-success' : 'bg-warning'}`}>
      {ctx.t(item.published ? 'pages.status.published' : 'pages.status.pending')}
    </span>
  ),
};

export const visibilityColumn = {
  key: 'visibility',
  kind: 'badge',
  labelKey: 'pages.table.visibility',
  sortValue: item => VISIBILITY_GROUP.order.indexOf(visibilityOf(item)),
  render: item => <VisibilityBadge visibility={visibilityOf(item)} />,
};

export const createdColumn = {
  key: 'created',
  kind: 'date',
  labelKey: 'pages.table.created',
  defaultHidden: true,
  sortValue: item => new Date(item.createdAt || 0).getTime(),
  render: item => localeDate(item.createdAt),
};

export const updatedColumn = {
  key: 'updated',
  kind: 'date',
  labelKey: 'pages.table.updated',
  defaultHidden: true,
  sortValue: item => new Date(item.updatedAt || 0).getTime(),
  render: item => localeDate(item.updatedAt),
};

export const releasedColumn = {
  key: 'released',
  kind: 'relative',
  labelKey: 'pages.table.released',
  sortValue: item => latestReleaseTime(item) || 0,
  render: (item, ctx) => {
    const time = latestReleaseTime(item);
    return time ? formatRelativeTime(time, ctx.language) : '';
  },
};

export const downloadsColumn = {
  key: 'downloads',
  kind: 'count',
  labelKey: 'pages.table.downloads',
  sortValue: item => item.downloads || 0,
  when: hasAny(item => typeof item.downloads === 'number'),
  render: item => (typeof item.downloads === 'number' ? item.downloads : ''),
};

export const versionsColumn = {
  key: 'versions',
  kind: 'count',
  labelKey: 'pages.table.versions',
  sortValue: item => (item.versions || []).length,
  render: item => (item.versions || []).length,
};

export const providersColumn = {
  key: 'providers',
  kind: 'badges',
  labelKey: 'pages.table.providers',
  sortValue: item => namesKey(providerNames(item)),
  render: item => nameBadges(providerNames(item)),
};

export const familyColumn = {
  key: 'family',
  kind: 'text',
  labelKey: 'pages.table.family',
  sortValue: item => (item.family || '').toLowerCase(),
  render: item => item.family || '',
};

export const vendorColumn = {
  key: 'vendor',
  kind: 'text',
  labelKey: 'pages.table.vendor',
  sortValue: item => (item.vendor || '').toLowerCase(),
  render: item => item.vendor || '',
};

export const releasesColumn = {
  key: 'releases',
  kind: 'count',
  labelKey: 'pages.table.releases',
  sortValue: item => (item.versions || []).length,
  render: item => (item.versions || []).length,
};

export const platformsColumn = {
  key: 'platforms',
  kind: 'badges',
  labelKey: 'pages.table.platforms',
  defaultHidden: true,
  sortValue: item => namesKey(platformNames(item)),
  render: item => nameBadges(platformNames(item)),
};

export const architecturesColumn = {
  key: 'architectures',
  kind: 'badges',
  labelKey: 'pages.table.architectures',
  defaultHidden: true,
  sortValue: item => namesKey(architectureNames(item)),
  render: item => nameBadges(architectureNames(item)),
};
