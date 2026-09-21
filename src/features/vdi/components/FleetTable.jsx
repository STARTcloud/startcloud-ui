import PropTypes from 'prop-types';
import { useState } from 'react';
import { Nav } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaTriangleExclamation } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import { CollapseButton } from '../../../components/common/GroupHeading';
import SubTable from '../../../components/common/SubTable';
import { sortShape } from '../../../utils/itemShape';
import { useVmHistory } from '../hooks/useVmHistory';
import { vmHasNoSession, vmIsDecommissioned, vmIsStandby, vmKey } from '../utils/vmStatus';

import CacheBadge from './CacheBadge';
import DriveBadges from './DriveBadges';
import IconsCell from './IconsCell';
import LastSeen from './LastSeen';
import SessionBadge, { sessionText } from './SessionBadge';
import VmHistory from './VmHistory';
import VmMetrics, { grafanaShape } from './VmMetrics';
import VmOverview from './VmOverview';
import VmStats from './VmStats';

const DECOMMISSION_KEYS = {
  hostname_recycled: 'vdi.status.recycled',
  uds_removed: 'vdi.status.removed',
};

const vmPath = vm => `/vm/${encodeURIComponent(vm.instance_id)}`;

const samOf = vm => (vm.user?.username ? vm.user.username.split('\\').pop() : '');

const userName = vm => vm.user?.display_name || samOf(vm);

const iconCount = vm => {
  if (vmIsStandby(vm) || vmHasNoSession(vm)) {
    return '';
  }
  return vm.desktop?.icon_count ?? '';
};

const drivesText = vm =>
  (vm.drives || []).map(drive => `${drive.letter}: ${drive.status}`).join(' ');

const HostnameCell = ({ vm, ctx }) => (
  <span className="d-inline-flex align-items-center gap-2">
    <CollapseButton
      collapsed={!ctx.expanded.has(vmKey(vm))}
      onToggle={() => ctx.toggleExpanded(vmKey(vm))}
    />
    <Link to={vmPath(vm)} className="fw-semibold">
      {vm.hostname}
    </Link>
  </span>
);

HostnameCell.propTypes = {
  vm: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
};

const PoolCell = ({ vm }) => {
  const { t } = useTranslation();
  if (vmIsDecommissioned(vm)) {
    return (
      <>
        {vm.uds?.pool_name ? `${vm.uds.pool_name} ` : ''}
        <span className="badge bg-danger bg-opacity-25 text-danger-emphasis">
          {t(DECOMMISSION_KEYS[vm.decommission_reason] || 'vdi.status.decommissioned')}
        </span>
      </>
    );
  }
  if (!vm.uds?.pool_name) {
    return <span className="text-body-tertiary">—</span>;
  }
  return (
    <>
      {vm.uds.pool_name} <CacheBadge uds={vm.uds} />
      {vm.uds.stale_image ? (
        <FaTriangleExclamation
          className="ms-1 text-danger"
          title={t('vdi.publication.staleImage')}
          aria-label={t('vdi.publication.staleImage')}
        />
      ) : null}
    </>
  );
};

PoolCell.propTypes = {
  vm: PropTypes.object.isRequired,
};

const UserCell = ({ vm }) => {
  const sam = samOf(vm);
  if (vm.user?.display_name) {
    return (
      <>
        {vm.user.display_name}
        <br />
        <small className="text-body-secondary">{sam}</small>
      </>
    );
  }
  return sam || <span className="text-body-tertiary">—</span>;
};

UserCell.propTypes = {
  vm: PropTypes.object.isRequired,
};

/**
 * The fleet table's columns, each sorting by what its cell shows: the
 * hostname, the pool name, the user's shown name, the session word, the
 * icon count, the last check-in instant, the cycle milliseconds and the
 * drive badges' text, a dash cell reading as empty.
 */
export const fleetColumns = [
  {
    key: 'hostname',
    kind: 'name',
    labelKey: 'vdi.table.hostname',
    value: vm => vm.hostname,
    render: (vm, ctx) => <HostnameCell vm={vm} ctx={ctx} />,
  },
  {
    key: 'pool',
    kind: 'text',
    labelKey: 'vdi.table.pool',
    value: vm => vm.uds?.pool_name || '',
    render: vm => <PoolCell vm={vm} />,
  },
  {
    key: 'user',
    kind: 'text',
    labelKey: 'vdi.table.user',
    value: userName,
    render: vm => <UserCell vm={vm} />,
  },
  {
    key: 'session',
    kind: 'badge',
    labelKey: 'vdi.table.session',
    value: (vm, ctx) => sessionText(vm, ctx.t),
    render: vm => <SessionBadge vm={vm} />,
  },
  {
    key: 'icons',
    kind: 'count',
    labelKey: 'vdi.table.icons',
    value: iconCount,
    render: vm => <IconsCell vm={vm} />,
  },
  {
    key: 'seen',
    kind: 'relative',
    labelKey: 'vdi.table.seen',
    value: vm => (vm.last_checkin ? new Date(vm.last_checkin).getTime() : 0),
    render: (vm, ctx) => <LastSeen vm={vm} now={ctx.now} />,
  },
  {
    key: 'cycle',
    kind: 'text',
    labelKey: 'vdi.table.cycle',
    value: vm => vm.timings_ms?.total_cycle || '',
    render: vm => (vm.timings_ms?.total_cycle ? `${vm.timings_ms.total_cycle}ms` : '—'),
  },
  {
    key: 'drives',
    kind: 'badges',
    labelKey: 'vdi.table.drives',
    value: drivesText,
    render: vm => <DriveBadges drives={vm.drives || []} />,
  },
];

const rowClass = vm => {
  if (vmIsDecommissioned(vm)) {
    return 'decommissioned';
  }
  if (vmIsStandby(vm) || !vm.last_checkin) {
    return 'standby';
  }
  return vmHasNoSession(vm) ? 'no-session' : '';
};

const TABS = ['overview', 'metrics', 'history', 'stats'];

const VmDetail = ({ vm, pools, now, grafana, theme }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('overview');
  const history = useVmHistory(vm.instance_id, { enabled: tab === 'history' || tab === 'stats' });
  const tabs = TABS.filter(key => key !== 'metrics' || grafana.enabled);
  return (
    <div className="p-3">
      <Nav variant="tabs" activeKey={tab} onSelect={key => setTab(key)} className="mb-3">
        {tabs.map(key => (
          <Nav.Item key={key}>
            <Nav.Link eventKey={key}>{t(`vdi.detail.${key}`)}</Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
      {tab === 'overview' ? <VmOverview vm={vm} pools={pools} now={now} /> : null}
      {tab === 'metrics' ? <VmMetrics vm={vm} grafana={grafana} theme={theme} /> : null}
      {tab === 'history' ? <VmHistory history={history} /> : null}
      {tab === 'stats' ? <VmStats stats={history.stats} loading={history.loading} /> : null}
    </div>
  );
};

VmDetail.propTypes = {
  vm: PropTypes.object.isRequired,
  pools: PropTypes.object.isRequired,
  now: PropTypes.number.isRequired,
  grafana: grafanaShape.isRequired,
  theme: PropTypes.string.isRequired,
};

/**
 * The fleet table: one row per VM over the hostname, pool, user, session,
 * icons, last-seen and cycle columns and the drives badge list last, the
 * pages contract's one column order, every header sorting into
 * the stack, the hostname linking to the VM's page beside a fold that
 * opens the inline detail with its Overview, Metrics (while Grafana is
 * enabled), History and Stats tabs; rows dimmed as standby, no-session or
 * decommissioned; every column resized through `widths` and `onResize`.
 */
const FleetTable = ({
  rows,
  sort,
  onSort,
  hiddenColumns,
  widths,
  onResize,
  expanded,
  onToggleExpanded,
  pools,
  now,
  grafana,
  theme,
  filtering,
}) => {
  const { t, i18n } = useTranslation();
  const ctx = { t, now, language: i18n.language, expanded, toggleExpanded: onToggleExpanded };
  return (
    <SubTable
      columns={fleetColumns}
      rows={rows}
      rowKey={vmKey}
      rowClass={rowClass}
      rowProp="vm"
      Detail={VmDetail}
      detailProps={{ pools, now, grafana, theme }}
      expandedKeys={expanded}
      sort={sort}
      onSort={onSort}
      hiddenColumns={hiddenColumns}
      widths={widths}
      onResize={onResize}
      ctx={ctx}
      emptyText={t(filtering ? 'pages.noMatches' : 'vdi.empty.title')}
    />
  );
};

FleetTable.propTypes = {
  rows: PropTypes.array.isRequired,
  sort: sortShape.isRequired,
  onSort: PropTypes.func.isRequired,
  hiddenColumns: PropTypes.instanceOf(Set).isRequired,
  widths: PropTypes.objectOf(PropTypes.number).isRequired,
  onResize: PropTypes.func.isRequired,
  expanded: PropTypes.instanceOf(Set).isRequired,
  onToggleExpanded: PropTypes.func.isRequired,
  pools: PropTypes.object.isRequired,
  now: PropTypes.number.isRequired,
  grafana: grafanaShape.isRequired,
  theme: PropTypes.string.isRequired,
  filtering: PropTypes.bool.isRequired,
};

export default FleetTable;
