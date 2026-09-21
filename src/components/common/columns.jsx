import { Link } from 'react-router-dom';

import {
  architectureNames,
  latestReleaseTime,
  platformNames,
  providerNames,
  visibilityOf,
} from '../../utils/itemShape';
import { managesListing } from '../../utils/permissions';
import { formatRelativeTime } from '../../utils/relativeTime';
import { itemPath } from '../../utils/routes';
import { OrgLogo } from '../layout/OrgSwitcherModal';

import { VisibilityBadge } from './StatusChips';
import { hasAny } from './SubTable';

const NONE = 'N/A';

const localeDate = value => (value ? new Date(value).toLocaleDateString() : '');

const timeOf = value => new Date(value || 0).getTime();

/**
 * The `when` of the two access columns, Visibility and Status: drawn
 * while the table has rows, for a viewer who manages the page's
 * organization, or any organization on the home listing, and for nobody
 * else, the same gate the cards' chips stand behind.
 *
 * @param {Array} rows - The table's rows
 * @param {Object} ctx - The page context, its `user` and `org`
 * @returns {boolean}
 */
export const managesRows = (rows, ctx) =>
  rows.length > 0 && managesListing(ctx.user, ctx.org || '');

/**
 * The text a badges cell shows: its names joined by a space, or `empty`
 * while it has none, the same text `nameBadges` draws as badges.
 *
 * @param {Array<string>} names - The badge names
 * @param {string} [empty] - The text drawn while there are no names
 * @returns {string} The cell's text
 */
export const badgesText = (names, empty = '') => (names.length > 0 ? names.join(' ') : empty);

/**
 * One small badge per name, or `empty` while there are none.
 *
 * @param {Array<string>} names - The badge names
 * @param {string} [empty] - The text drawn while there are no names
 * @returns {import('react').ReactNode} The badges
 */
export const nameBadges = (names, empty = '') =>
  names.length > 0 ? (
    <span className="d-inline-flex flex-wrap gap-1">
      {names.map(name => (
        <span key={name} className="badge bg-secondary badge-xs">
          {name}
        </span>
      ))}
    </span>
  ) : (
    empty
  );

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

export const nameColumn = {
  key: 'name',
  kind: 'name',
  labelKey: 'pages.table.name',
  value: item => item.name,
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
  value: item => item.label || item.name,
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
  value: item => item.os?.label || '',
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

const statusWord = (item, ctx) =>
  ctx.t(item.published ? 'pages.status.published' : 'pages.status.pending');

export const statusColumn = {
  key: 'status',
  kind: 'badge',
  labelKey: 'pages.table.status',
  when: managesRows,
  value: statusWord,
  render: (item, ctx) => (
    <span className={`badge ${item.published ? 'bg-success' : 'bg-warning'}`}>
      {statusWord(item, ctx)}
    </span>
  ),
};

export const visibilityColumn = {
  key: 'visibility',
  kind: 'badge',
  labelKey: 'pages.table.visibility',
  when: managesRows,
  value: (item, ctx) => {
    const visibility = visibilityOf(item);
    return visibility ? ctx.t(`pages.status.${visibility}`) : '';
  },
  render: item => <VisibilityBadge visibility={visibilityOf(item)} />,
};

export const createdColumn = {
  key: 'created',
  kind: 'date',
  labelKey: 'pages.table.created',
  defaultHidden: true,
  value: item => timeOf(item.createdAt),
  render: item => localeDate(item.createdAt),
};

export const updatedColumn = {
  key: 'updated',
  kind: 'date',
  labelKey: 'pages.table.updated',
  defaultHidden: true,
  value: item => timeOf(item.updatedAt),
  render: item => localeDate(item.updatedAt),
};

export const releasedColumn = {
  key: 'released',
  kind: 'relative',
  labelKey: 'pages.table.released',
  value: item => latestReleaseTime(item) || 0,
  render: (item, ctx) => {
    const time = latestReleaseTime(item);
    return time ? formatRelativeTime(time, ctx.language) : '';
  },
};

export const downloadsColumn = {
  key: 'downloads',
  kind: 'count',
  labelKey: 'pages.table.downloads',
  when: hasAny(item => typeof item.downloads === 'number'),
  value: item => (typeof item.downloads === 'number' ? item.downloads : ''),
};

export const versionsColumn = {
  key: 'versions',
  kind: 'count',
  labelKey: 'pages.table.versions',
  value: item => (item.versions || []).length,
};

export const providersColumn = {
  key: 'providers',
  kind: 'badges',
  labelKey: 'pages.table.providers',
  value: item => badgesText(providerNames(item), NONE),
  render: item => nameBadges(providerNames(item), NONE),
};

export const familyColumn = {
  key: 'family',
  kind: 'text',
  labelKey: 'pages.table.family',
  value: item => item.family || '',
};

export const vendorColumn = {
  key: 'vendor',
  kind: 'text',
  labelKey: 'pages.table.vendor',
  value: item => item.vendor || '',
};

export const releasesColumn = {
  key: 'releases',
  kind: 'count',
  labelKey: 'pages.table.releases',
  value: item => (item.versions || []).length,
};

export const platformsColumn = {
  key: 'platforms',
  kind: 'badges',
  labelKey: 'pages.table.platforms',
  defaultHidden: true,
  value: item => badgesText(platformNames(item), NONE),
  render: item => nameBadges(platformNames(item), NONE),
};

export const architecturesColumn = {
  key: 'architectures',
  kind: 'badges',
  labelKey: 'pages.table.architectures',
  defaultHidden: true,
  value: item => badgesText(architectureNames(item), NONE),
  render: item => nameBadges(architectureNames(item), NONE),
};
