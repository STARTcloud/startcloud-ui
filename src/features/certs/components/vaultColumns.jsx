import { Link } from 'react-router-dom';

import { localeDate, timeOf } from '../../../components/common/columns';
import { hasAny } from '../../../components/common/SubTable';
import { formatRelativeTime } from '../../../utils/relativeTime';
import {
  algorithmOf,
  issuerOf,
  nameOf,
  notAfterOf,
  recordPath,
  recordStatus,
} from '../utils/records';

import StatusBadge from './StatusBadge';

const statusWord = (record, ctx) => {
  const status = recordStatus(record, ctx.now, ctx.thresholdDays);
  return status ? ctx.t(`certs.status.${status}`) : '';
};

const hasEnd = hasAny(notAfterOf);

/**
 * The vault table's columns, each sorting by what its cell shows: the
 * name linking to the record's page, the kind, the profile where any
 * record names one, the expiry status as a badge and the end as a date
 * where any record has an end, the algorithm and the issuer where any
 * record carries them, the count of versions held where any record holds
 * one and the last change as a relative time.
 */
export const vaultColumns = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'pages.table.name',
    value: nameOf,
    render: record => (
      <Link to={recordPath(record)} className="fw-semibold">
        {nameOf(record)}
      </Link>
    ),
  },
  {
    key: 'kind',
    kind: 'word',
    labelKey: 'certs.table.kind',
    priority: 2,
    value: (record, ctx) => ctx.t(`certs.kind.${record.kind}`),
  },
  {
    key: 'profile',
    kind: 'word',
    labelKey: 'certs.table.profile',
    priority: 3,
    when: hasAny(record => record.profile),
    value: (record, ctx) => (record.profile ? ctx.t(`certs.profile.${record.profile}.label`) : ''),
  },
  {
    key: 'status',
    kind: 'badge',
    labelKey: 'pages.table.status',
    priority: 2,
    when: hasEnd,
    value: statusWord,
    render: (record, ctx) => (
      <StatusBadge status={recordStatus(record, ctx.now, ctx.thresholdDays)} />
    ),
  },
  {
    key: 'expires',
    kind: 'date',
    labelKey: 'certs.table.expires',
    priority: 3,
    when: hasEnd,
    value: record => timeOf(notAfterOf(record)),
    render: (record, ctx) => localeDate(notAfterOf(record), ctx.language),
  },
  {
    key: 'algorithm',
    kind: 'text',
    labelKey: 'certs.table.algorithm',
    when: hasAny(algorithmOf),
    value: algorithmOf,
  },
  {
    key: 'issuer',
    kind: 'text',
    labelKey: 'certs.table.issuer',
    when: hasAny(issuerOf),
    value: issuerOf,
  },
  {
    key: 'history',
    kind: 'count',
    labelKey: 'certs.table.history',
    when: hasAny(record => (record.history || []).length > 0),
    value: record => (record.history || []).length,
  },
  {
    key: 'updated',
    kind: 'relative',
    labelKey: 'pages.table.updated',
    value: record => timeOf(record.updated_at),
    render: (record, ctx) => formatRelativeTime(record.updated_at, ctx.language),
  },
];
