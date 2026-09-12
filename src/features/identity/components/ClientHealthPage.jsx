import PropTypes from 'prop-types';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaRotate } from 'react-icons/fa6';

import SubTable from '../../../components/common/SubTable';
import ViewToggle from '../../../components/common/ViewToggle';
import { useDetailSearch } from '../../../hooks/useDetailSearch';
import { useUrlNarrowing } from '../../../hooks/useUrlNarrowing';
import { clientHealth } from '../api/health';
import { useAdminRead } from '../hooks/useAdminRead';
import { CLIENT_HEALTH } from '../utils/examples';

import AdminLoading from './AdminLoading';
import DateCell from './DateCell';
import TableWrap from './TableWrap';

const PREFS_KEY = 'table_prefs_admin_client_health';
const VIEWS = ['table', 'cards'];
const HTTPS = /^https?:/;

const stateOf = probe => {
  if (probe.healthy === null || probe.healthy === undefined) {
    return 'unknown';
  }
  return probe.healthy ? 'healthy' : 'unhealthy';
};

const TONES = { healthy: 'success', unhealthy: 'danger', unknown: 'secondary' };
const STATE_ORDER = { healthy: 0, unhealthy: 1, unknown: 2 };

const reasonOf = probe =>
  stateOf(probe) === 'unhealthy' ? probe.error_message || probe.status : '';

const probeShape = PropTypes.shape({
  client_id: PropTypes.string.isRequired,
  client_name: PropTypes.string.isRequired,
  kind: PropTypes.oneOf(['client', 'provider']).isRequired,
  description: PropTypes.string,
  base_url: PropTypes.string,
  check: PropTypes.oneOf(['actuator_health', 'http_reachability']),
  endpoint: PropTypes.string,
  healthy: PropTypes.bool,
  status: PropTypes.string,
  response_time_ms: PropTypes.number,
  last_checked: PropTypes.string,
  error_message: PropTypes.string,
});

const BaseUrl = ({ url }) => {
  if (!url) {
    return null;
  }
  if (HTTPS.test(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {url}
      </a>
    );
  }
  return <span>{url}</span>;
};

BaseUrl.propTypes = {
  url: PropTypes.string,
};

const ResponseTime = ({ probe }) => {
  const { t } = useTranslation();
  return typeof probe.response_time_ms === 'number'
    ? t('admin.health.clients.responseTime', { ms: probe.response_time_ms })
    : t('admin.health.clients.noResponse');
};

ResponseTime.propTypes = {
  probe: probeShape.isRequired,
};

const StatusBadge = ({ probe }) => {
  const { t } = useTranslation();
  const state = stateOf(probe);
  return <span className={`badge bg-${TONES[state]}`}>{t(`admin.health.status.${state}`)}</span>;
};

StatusBadge.propTypes = {
  probe: probeShape.isRequired,
};

const Probe = ({ probe }) => {
  const { t } = useTranslation();
  return (
    <span>
      <ResponseTime probe={probe} />
      {probe.last_checked ? (
        <>
          {' · '}
          {t('admin.health.clients.checked')} <DateCell value={probe.last_checked} />
        </>
      ) : null}
    </span>
  );
};

Probe.propTypes = {
  probe: probeShape.isRequired,
};

const HealthCard = ({ probe }) => {
  const { t } = useTranslation();
  const state = stateOf(probe);
  const tone = TONES[state];
  return (
    <div className={`card h-100 border-${tone}`}>
      <div
        className={`card-header d-flex justify-content-between align-items-center bg-${tone}-subtle`}
      >
        <strong>{probe.client_name}</strong>
        <StatusBadge probe={probe} />
      </div>
      <div className="card-body small d-flex flex-column gap-1">
        <span>
          {probe.kind === 'provider' ? `${t('admin.health.providers.one')} ` : ''}
          <code>{probe.client_id}</code>
        </span>
        {probe.description ? <span>{probe.description}</span> : null}
        <BaseUrl url={probe.base_url} />
        {state !== 'unknown' ? <Probe probe={probe} /> : null}
        {probe.check || state === 'unhealthy' ? (
          <dl className="row mb-0 mt-1 g-0">
            {probe.check ? (
              <>
                <dt className="col-4">{t('admin.health.clients.check')}</dt>
                <dd className="col-8 mb-1">{t(`admin.health.clients.checkOf.${probe.check}`)}</dd>
              </>
            ) : null}
            {probe.endpoint ? (
              <>
                <dt className="col-4">{t('admin.health.clients.endpoint')}</dt>
                <dd className="col-8 mb-1 text-break">{probe.endpoint}</dd>
              </>
            ) : null}
            {state === 'unhealthy' ? (
              <>
                <dt className="col-4">{t('admin.health.clients.reason')}</dt>
                <dd className="col-8 mb-0 text-danger text-break">{reasonOf(probe)}</dd>
              </>
            ) : null}
          </dl>
        ) : null}
      </div>
    </div>
  );
};

HealthCard.propTypes = {
  probe: probeShape.isRequired,
};

const CardGrid = ({ probes, emptyText }) => (
  <div className="row g-3 mb-4">
    {probes.map(probe => (
      <div key={probe.client_id} className="col-md-6 col-xl-4">
        <HealthCard probe={probe} />
      </div>
    ))}
    {probes.length === 0 ? <div className="col text-muted">{emptyText}</div> : null}
  </div>
);

CardGrid.propTypes = {
  probes: PropTypes.arrayOf(probeShape).isRequired,
  emptyText: PropTypes.node.isRequired,
};

const columns = [
  {
    key: 'name',
    labelKey: 'admin.health.clients.table.name',
    sortValue: row => row.client_name.toLowerCase(),
    render: row => (
      <span>
        <strong>{row.client_name}</strong>
        <br />
        <code className="small">{row.client_id}</code>
      </span>
    ),
  },
  {
    key: 'kind',
    labelKey: 'admin.health.clients.table.kind',
    sortValue: row => row.kind,
    render: (row, ctx) => ctx.t(`admin.health.clients.kind.${row.kind}`),
  },
  {
    key: 'check',
    labelKey: 'admin.health.clients.check',
    sortValue: row => row.check || '',
    render: (row, ctx) => (row.check ? ctx.t(`admin.health.clients.checkOf.${row.check}`) : '—'),
  },
  {
    key: 'endpoint',
    labelKey: 'admin.health.clients.endpoint',
    className: 'text-break',
    sortValue: row => row.endpoint || '',
    render: row => row.endpoint || <BaseUrl url={row.base_url} />,
  },
  {
    key: 'status',
    labelKey: 'admin.health.clients.table.status',
    sortValue: row => STATE_ORDER[stateOf(row)],
    render: row => <StatusBadge probe={row} />,
  },
  {
    key: 'response_time_ms',
    labelKey: 'admin.health.clients.table.responseTime',
    className: 'text-end',
    sortValue: row => (typeof row.response_time_ms === 'number' ? row.response_time_ms : -1),
    render: row => (stateOf(row) === 'unknown' ? '—' : <ResponseTime probe={row} />),
  },
  {
    key: 'last_checked',
    labelKey: 'admin.health.clients.table.lastChecked',
    sortValue: row => new Date(row.last_checked || 0).getTime(),
    render: row => <DateCell value={row.last_checked} />,
  },
  {
    key: 'reason',
    labelKey: 'admin.health.clients.reason',
    className: 'text-break',
    sortValue: row => reasonOf(row).toLowerCase(),
    render: row => <span className="text-danger">{reasonOf(row)}</span>,
  },
];

const FILTER_GROUPS = [
  {
    key: 'status',
    labelKey: 'admin.health.clients.table.status',
    values: row => [stateOf(row)],
    order: ['healthy', 'unhealthy', 'unknown'],
    activeClass: 'bg-primary',
    labelFor: (value, t) => t(`admin.health.status.${value}`),
  },
  {
    key: 'kind',
    labelKey: 'admin.health.clients.table.kind',
    values: row => [row.kind],
    order: ['client', 'provider'],
    activeClass: 'bg-info',
    labelFor: (value, t) => t(`admin.health.clients.kind.${value}`),
  },
];
const FILTER_KEYS = FILTER_GROUPS.map(group => group.key);

const anyUnhealthy = probes => probes.some(probe => probe.healthy === false);

const matches = (probe, needle) =>
  [probe.client_name, probe.base_url || ''].some(text => text.toLowerCase().includes(needle));

const withKind = (probes, kind) => probes.map(probe => ({ ...probe, kind }));

const rowsOf = data => [
  ...withKind(data?.clients || [], 'client'),
  ...withKind(data?.providers || [], 'provider'),
];

/**
 * Health › Client health: the summary line at the top, drawn as a
 * warning while any client or provider is unhealthy, with Refresh, which
 * re-fetches and reloads nothing, and the pages contract's one view
 * toggle, list or cards; the list a `SubTable` over every client and
 * provider with the columns Name, Kind, Check, Endpoint, Status, Response
 * time, Last checked and Reason, header sort, the Status and Kind
 * `toggle` groups narrowing the rows client-side, the query and their
 * values in the URL as `search`, `status` and `kind` through
 * `useUrlNarrowing`, and the Columns group; the
 * cards one per client and provider in three states with one status
 * each, a probed card naming the check the server performed
 * (`actuator_health` or `http_reachability`) and the exact endpoint it
 * requested, an unhealthy card adding the failure reason, an unprobed
 * row carrying neither; both views drawn from the same rows the navbar
 * query narrows by name and base URL, the view, the sort and the hidden
 * columns kept as one object under `table_prefs_admin_client_health`
 * through `useDetailSearch`.
 */
const ClientHealthPage = () => {
  const { t, i18n } = useTranslation();
  const { data, loading, reload } = useAdminRead({ read: clientHealth, example: CLIENT_HEALTH });
  const rows = useMemo(() => rowsOf(data), [data]);
  const url = useUrlNarrowing({ queryKey: 'search', filterKeys: FILTER_KEYS });
  const search = useDetailSearch({
    rows,
    matches,
    placeholderKey: 'admin.health.clients.search',
    columns,
    prefsKey: PREFS_KEY,
    filterGroups: FILTER_GROUPS,
    url,
    bound: {
      query: url.query,
      onQueryChange: url.setQuery,
      placeholder: t('admin.health.clients.search'),
    },
    views: VIEWS,
  });

  useEffect(() => {
    document.title = t('admin.health.clients.title');
  }, [t]);

  if (loading && !data) {
    return <AdminLoading />;
  }
  if (!data) {
    return null;
  }

  const summary = data.summary || {};
  const allClients = data.clients || [];
  const allProviders = data.providers || [];
  const warn = anyUnhealthy(allClients) || anyUnhealthy(allProviders);
  const healthyProviders = allProviders.filter(probe => probe.healthy === true).length;
  const emptyText = search.filtering ? t('pages.noMatches') : t('pages.empty');

  return (
    <div>
      <div
        className={`alert d-flex flex-wrap align-items-center gap-2 ${warn ? 'alert-warning' : 'alert-success'}`}
        role="status"
      >
        <span className="flex-grow-1">
          <strong>
            {t('admin.health.clients.summary', {
              healthy: summary.healthy ?? 0,
              total: summary.total ?? allClients.length,
            })}
          </strong>
          {' · '}
          {t('admin.health.providers.summary', {
            healthy: healthyProviders,
            total: allProviders.length,
          })}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={reload}
          disabled={loading}
        >
          <FaRotate className="me-1" aria-hidden="true" />
          {t('admin.health.refresh')}
        </button>
        <ViewToggle view={search.view} onChange={search.setView} />
      </div>
      {search.view === 'cards' ? (
        <>
          <h5>{t('admin.health.clients.heading')}</h5>
          <CardGrid
            probes={search.rows.filter(row => row.kind === 'client')}
            emptyText={emptyText}
          />
          <h5>{t('admin.health.providers.heading')}</h5>
          <CardGrid
            probes={search.rows.filter(row => row.kind === 'provider')}
            emptyText={emptyText}
          />
        </>
      ) : (
        <TableWrap>
          <SubTable
            columns={columns}
            rows={search.rows}
            rowKey={row => `${row.kind}:${row.client_id}`}
            sort={search.sort}
            onSort={search.setSort}
            hiddenColumns={search.hiddenColumns}
            ctx={{ t, language: i18n.language }}
            emptyText={emptyText}
          />
        </TableWrap>
      )}
    </div>
  );
};

export default ClientHealthPage;
