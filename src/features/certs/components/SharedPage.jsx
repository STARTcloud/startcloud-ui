import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCloudArrowDown, FaRotate } from 'react-icons/fa6';

import {
  localeDate,
  statusColumn,
  timeOf,
  visibilityColumn,
} from '../../../components/common/columns';
import SectionHeading from '../../../components/common/SectionHeading';
import { VisibilityBadge } from '../../../components/common/StatusChips';
import SubTable from '../../../components/common/SubTable';
import { pickedOf } from '../../../components/common/VisibilityPicker';
import { useNotify } from '../../../contexts/NoticeContext';
import { useArrival } from '../../../hooks/useArrival';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { pageContextShape } from '../../../utils/itemShape';
import { formatRelativeTime } from '../../../utils/relativeTime';
import { fetchCerts } from '../api/certsStore';
import { useVault } from '../hooks/useVault';
import { nowOf, statusOf } from '../utils/records';
import { recordOf, rowNotAfter } from '../utils/sync';

import StatusBadge from './StatusBadge';

const matchesRow = (row, needle) =>
  [row.name, row.subject, row.created_by, row.organization]
    .filter(Boolean)
    .some(text => String(text).toLowerCase().includes(needle));

const rowStatus = (row, ctx) => statusOf(rowNotAfter(row), ctx.now, ctx.thresholdDays);

const columns = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'pages.table.name',
    value: row => row.name,
    render: row => <span className="fw-semibold">{row.name}</span>,
  },
  {
    key: 'kind',
    kind: 'word',
    labelKey: 'certs.table.kind',
    priority: 2,
    value: (row, ctx) => ctx.t(`certs.kind.${row.kind}`),
  },
  {
    key: 'subject',
    kind: 'text',
    labelKey: 'certs.table.subject',
    value: row => row.subject || '',
  },
  {
    key: 'status',
    kind: 'badge',
    labelKey: 'pages.table.status',
    priority: 2,
    value: (row, ctx) => (rowStatus(row, ctx) ? ctx.t(`certs.status.${rowStatus(row, ctx)}`) : ''),
    render: (row, ctx) => <StatusBadge status={rowStatus(row, ctx)} />,
  },
  {
    key: 'expires',
    kind: 'date',
    labelKey: 'certs.table.expires',
    priority: 3,
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
  {
    key: 'created_by',
    kind: 'text',
    labelKey: 'certs.table.sharedBy',
    value: row => row.created_by || '',
  },
  {
    key: 'updated',
    kind: 'relative',
    labelKey: 'pages.table.updated',
    value: row => timeOf(row.updated_at),
    render: (row, ctx) => formatRelativeTime(row.updated_at, ctx.language),
  },
];

const groupsOf = ctx => [
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

const PullAction = ({ row, held, onPull }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-primary"
      data-action="pull"
      onClick={() => onPull(row)}
    >
      <FaCloudArrowDown className="me-1" aria-hidden="true" />
      {t(held.has(row.id) ? 'certs.shared.pullAgain' : 'certs.shared.pull')}
    </button>
  );
};

PullAction.propTypes = {
  row: PropTypes.object.isRequired,
  held: PropTypes.instanceOf(Set).isRequired,
  onPull: PropTypes.func.isRequired,
};

const useSharedRows = organizations => {
  const [state, setState] = useState({ rows: [], loaded: false, failed: false });
  const names = organizations.map(organization => organization.name).join(',');

  const read = useCallback(() => {
    const list = names ? names.split(',') : [];
    Promise.all(list.map(name => fetchCerts(name).catch(() => [])))
      .then(answers => {
        const seen = new Set();
        const rows = answers
          .flat()
          .filter(row => Array.isArray(answers) && row && !seen.has(row.id) && seen.add(row.id));
        setState({ rows, loaded: true, failed: false });
      })
      .catch(error => {
        log.api.error('Error fetching shared certificates', { error: error.message });
        setState(current => ({ ...current, loaded: true, failed: true }));
      });
  }, [names]);

  useEffect(() => {
    read();
  }, [read]);

  useEventStream('cert-updated', () => read());
  useEventStream('cert-removed', () => read());

  return { ...state, read };
};

const groupRows = (organizations, rows) =>
  organizations.map(organization => ({
    key: organization.name,
    organization: { name: organization.name, logo: organization.logo || '' },
    items: rows.filter(row => row.organization === organization.name),
  }));

/**
 * The shared store at `/certs/shared`, drawn while the host lists
 * `certs-store` and a person is signed in: the rows of every
 * organization the person belongs to, read on open, on Refresh and on
 * the `certs` topic's events, one organization group row per
 * organization the way the listings group their rows, narrowed by the
 * navbar binding under `table_prefs_certs_shared` with the Kind,
 * Status, Visibility and Organization groups, a `#<id>` in the URL
 * landing on that row, each row's Pull to vault keeping the row's
 * record in the vault under its `remote_id`; Pull never deletes.
 */
const SharedPage = ({ context }) => {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const vault = useVault();
  const shared = useSharedRows(vault.organizations);
  const [collapsed, setCollapsed] = useState({});
  const thresholdDays = vault.preferences.threshold_days;
  const ctx = { ...context, t, language: i18n.language, now: nowOf(), thresholdDays };
  const search = useDetailSearch({
    rows: shared.rows,
    matches: matchesRow,
    placeholderKey: 'certs.search.sharedPlaceholder',
    columns,
    ctx,
    prefsKey: `${context.prefsPrefix}_certs_shared`,
    filterGroups: groupsOf(ctx),
  });
  const arrival = useArrival(search.rows);
  const held = new Set(vault.records.map(record => record.remote_id).filter(Boolean));

  useEffect(() => {
    document.title = `${t('certs.sidebar.shared')} · ${context.appName}`;
  }, [context.appName, t]);

  const pull = row => {
    const record = recordOf(row);
    const existing = vault.records.find(entry => entry.remote_id === row.id) || null;
    const write = existing
      ? vault.update(existing, { ...record, id: existing.id }, { source: 'sync' })
      : vault.add(record, { source: 'sync' });
    write.then(() => notify('success', t('certs.notice.pulled', { name: row.name })));
  };

  const refresh = (
    <button
      type="button"
      className="btn btn-sm btn-outline-secondary"
      data-action="refresh"
      onClick={shared.read}
    >
      <FaRotate className="me-1" aria-hidden="true" />
      {t('certs.shared.refresh')}
    </button>
  );

  return (
    <div className="list row" data-page="certs-shared">
      <SectionHeading
        title={t('certs.shared.title')}
        count={shared.loaded ? shared.rows.length : t('pages.loading')}
        state={shared.failed ? 'warning' : null}
        actions={refresh}
      />
      {shared.failed ? (
        <div className="alert alert-danger" role="alert">
          {t('certs.shared.loadError')}
        </div>
      ) : null}
      <SubTable
        columns={columns}
        rows={search.rows}
        groups={groupRows(vault.organizations, search.rows)}
        collapsed={collapsed}
        onToggleGroup={key => setCollapsed(current => ({ ...current, [key]: !current[key] }))}
        countKey="certs.shared.count"
        rowKey={row => row.id}
        rowRef={arrival.ref}
        rowProp="row"
        RowActions={PullAction}
        actionsProps={{ held, onPull: pull }}
        sort={search.sort}
        onSort={search.setSort}
        hiddenColumns={search.hiddenColumns}
        widths={search.widths}
        onResize={search.setColumnWidth}
        ctx={ctx}
        emptyText={t(search.filtering ? 'pages.noMatches' : 'pages.empty')}
      />
    </div>
  );
};

SharedPage.propTypes = {
  context: pageContextShape.isRequired,
};

export default SharedPage;
