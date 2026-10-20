import {
  localeDate,
  statusColumn,
  timeOf,
  visibilityColumn,
} from '../../../components/common/columns';
import { VisibilityBadge } from '../../../components/common/StatusChips';
import { hasAny } from '../../../components/common/SubTable';
import { pickedOf } from '../../../components/common/VisibilityPicker';
import { formatRelativeTime } from '../../../utils/relativeTime';
import { statusOf } from '../utils/records';
import { rowNotAfter } from '../utils/sync';

import StatusBadge from './StatusBadge';

const rowStatus = (row, ctx) => statusOf(rowNotAfter(row), ctx.now, ctx.thresholdDays);

const profileOf = row => row.profile || row.record?.profile || '';

const nameColumn = {
  key: 'name',
  kind: 'name',
  labelKey: 'pages.table.name',
  value: row => row.name,
  render: row => <span className="fw-semibold">{row.name}</span>,
};

const kindColumn = {
  key: 'kind',
  kind: 'word',
  labelKey: 'certs.table.kind',
  priority: 2,
  value: (row, ctx) => ctx.t(`certs.kind.${row.kind}`),
};

const profileColumn = {
  key: 'profile',
  kind: 'word',
  labelKey: 'certs.table.profile',
  priority: 3,
  when: hasAny(profileOf),
  value: (row, ctx) => (profileOf(row) ? ctx.t(`certs.profile.${profileOf(row)}.label`) : ''),
};

/**
 * The Org column of a table over the stores' rows: the organization the
 * row belongs to, blank for a row of none, drawn while any row names one.
 */
export const organizationColumn = {
  key: 'organization',
  kind: 'word',
  labelKey: 'certs.table.organization',
  priority: 3,
  when: hasAny(row => row.organization),
  value: row => row.organization || '',
};

const sharedByColumn = {
  key: 'created_by',
  kind: 'text',
  labelKey: 'certs.table.sharedBy',
  value: row => row.created_by || '',
};

const updatedColumn = {
  key: 'updated',
  kind: 'relative',
  labelKey: 'pages.table.updated',
  value: row => timeOf(row.updated_at),
  render: (row, ctx) => formatRelativeTime(row.updated_at, ctx.language),
};

/**
 * The columns of a table over the store's wire rows: the name, the kind,
 * the profile where any row names one, the organization where any row
 * names one, the subject, the expiry status and
 * the end where any row has one, the visibility and the published words
 * for a viewer who manages the rows, who shared the row and the last
 * change as a relative time.
 */
export const STORE_COLUMNS = [
  nameColumn,
  kindColumn,
  profileColumn,
  organizationColumn,
  {
    key: 'subject',
    kind: 'text',
    labelKey: 'certs.table.subject',
    when: hasAny(row => row.subject),
    value: row => row.subject || '',
  },
  {
    key: 'status',
    kind: 'badge',
    labelKey: 'pages.table.status',
    priority: 2,
    when: hasAny(rowNotAfter),
    value: (row, ctx) => (rowStatus(row, ctx) ? ctx.t(`certs.status.${rowStatus(row, ctx)}`) : ''),
    render: (row, ctx) => <StatusBadge status={rowStatus(row, ctx)} />,
  },
  {
    key: 'expires',
    kind: 'date',
    labelKey: 'certs.table.expires',
    priority: 3,
    when: hasAny(rowNotAfter),
    value: row => timeOf(rowNotAfter(row)),
    render: (row, ctx) => localeDate(rowNotAfter(row), ctx.language),
  },
  {
    ...visibilityColumn,
    value: (row, ctx) => ctx.t(`pages.status.${pickedOf(row)}`),
    render: row => <VisibilityBadge visibility={pickedOf(row)} />,
  },
  {
    ...statusColumn,
    key: 'published',
    labelKey: 'certs.table.published',
  },
  sharedByColumn,
  updatedColumn,
];

/**
 * The columns of a table over the store's secret rows alone: the name,
 * the kind, the profile, who shared the row and the last change.
 */
export const SECRET_STORE_COLUMNS = [
  nameColumn,
  kindColumn,
  profileColumn,
  sharedByColumn,
  updatedColumn,
];

/**
 * The filter groups of a table over the store's secret rows, the kind
 * and the profile.
 */
export const SECRET_STORE_FILTERS = [
  {
    key: 'kind',
    labelKey: 'certs.filter.kind',
    values: row => [row.kind],
    activeClass: 'bg-primary',
    labelFor: (value, t) => t(`certs.kind.${value}`),
  },
  {
    key: 'profile',
    labelKey: 'certs.filter.profile',
    values: row => (profileOf(row) ? [profileOf(row)] : []),
    activeClass: 'bg-info',
    labelFor: (value, t) => t(`certs.profile.${value}.label`),
  },
];

/**
 * The filter groups of a table over the store's wire rows: the kind, the
 * expiry status read at `ctx.now` against `ctx.thresholdDays`, the
 * visibility and the organization.
 *
 * @param {Object} ctx - The context the table draws with, with `now` and `thresholdDays`
 * @returns {Array<Object>} The groups
 */
export const storeFilterGroupsOf = ctx => [
  {
    key: 'kind',
    labelKey: 'certs.filter.kind',
    values: row => [row.kind],
    activeClass: 'bg-primary',
    labelFor: (value, t) => t(`certs.kind.${value}`),
  },
  {
    key: 'status',
    labelKey: 'certs.filter.status',
    values: row => (rowStatus(row, ctx) ? [rowStatus(row, ctx)] : []),
    activeClass: 'bg-success',
    labelFor: (value, t) => t(`certs.status.${value}`),
  },
  {
    key: 'visibility',
    labelKey: 'pages.table.visibility',
    values: row => [pickedOf(row)],
    activeClass: 'bg-info',
    labelFor: (value, t) => t(`pages.status.${value}`),
  },
  {
    key: 'organization',
    labelKey: 'certs.filter.organization',
    values: row => [row.organization],
    activeClass: 'bg-secondary',
    labelFor: value => value,
  },
];

/**
 * Whether a store row matches a query: its name, its subject, its
 * profile, who shared it and its organization.
 *
 * @param {Object} row - The wire row
 * @param {string} needle - The query, lower-cased
 * @returns {boolean} True when the row matches
 */
export const matchesStoreRow = (row, needle) =>
  [row.name, row.subject, profileOf(row), row.created_by, row.organization]
    .filter(Boolean)
    .some(text => String(text).toLowerCase().includes(needle));
