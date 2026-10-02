import PropTypes from 'prop-types';
import { useRef } from 'react';
import { FaLock, FaLockOpen } from 'react-icons/fa6';

import { hasAny } from '../../../components/common/SubTable';
import { useCssVar } from '../../../hooks/useCssVar';
import {
  holdHandles,
  holdsOf,
  snapshotDepth,
  snapshotFlags,
  snapshotInstant,
} from '../utils/snapshots';
import { formatByteSize, formatTaskDate } from '../utils/tasks';

const FLAG_LABELS = {
  current: 'machine.machineSnapshots.currentBadge',
  held: 'hosts.snapshots.flag.held',
};

const datasetCount = row =>
  Number.isFinite(row.datasets) ? row.datasets : holdHandles(row).length;

const SnapshotName = ({ row }) => {
  const label = useRef(null);
  useCssVar(label, '--snapshot-depth', String(snapshotDepth(row)));
  return (
    <span ref={label} className="snapshot-name fw-semibold">
      {row.name}
    </span>
  );
};

SnapshotName.propTypes = {
  row: PropTypes.shape({ name: PropTypes.string.isRequired }).isRequired,
};

const HoldsCell = ({ row, ctx }) => {
  const count = holdsOf(row);
  const label = ctx.t('machine.machineSnapshots.holdsCount', { count });
  if (!ctx.holdable || holdHandles(row).length === 0) {
    return count > 0 ? (
      <span
        className="badge text-bg-secondary"
        title={ctx.t('machine.machineSnapshots.holdsPinTooltip')}
      >
        {label}
      </span>
    ) : null;
  }
  const Icon = count > 0 ? FaLock : FaLockOpen;
  return (
    <button
      type="button"
      className={`btn btn-sm ${count > 0 ? 'btn-secondary' : 'btn-outline-secondary'}`}
      title={ctx.t('machine.machineSnapshots.holdsManageTooltip')}
      data-action="holds"
      onClick={() => ctx.onHolds(row)}
    >
      <Icon className="me-1" aria-hidden="true" />
      {label}
    </button>
  );
};

HoldsCell.propTypes = {
  row: PropTypes.object.isRequired,
  ctx: PropTypes.shape({
    t: PropTypes.func.isRequired,
    holdable: PropTypes.bool.isRequired,
    onHolds: PropTypes.func.isRequired,
  }).isRequired,
};

/**
 * The columns of a machine's snapshots, hyperweaver-ui's snapshot row
 * carried into the one table: the name, set in by its depth in the tree
 * of VirtualBox; the mark of the snapshot the machine's state derives
 * from; the holds, the button that opens them on a host that lists
 * `zfs` for a row that names its datasets; the instant it was taken;
 * the space it uses; the datasets that carry it, their names the cell's
 * tooltip; the description; and the uuid, hidden until asked for. Every
 * column after the name draws only while a row carries its value,
 * because hyperweaver-agent answers the tree of VirtualBox and
 * zoneweaver-agent the snapshots of datasets, and the two rows share the
 * name and the description alone.
 */
export const SNAPSHOT_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'hosts.snapshots.column.name',
    value: row => row.name,
    render: row => <SnapshotName row={row} />,
  },
  {
    key: 'current',
    kind: 'badge',
    labelKey: 'hosts.snapshots.column.current',
    when: hasAny(row => row.current),
    value: (row, ctx) => (row.current ? ctx.t('machine.machineSnapshots.currentBadge') : ''),
    render: (row, ctx) =>
      row.current ? (
        <span
          className="badge text-bg-success"
          title={ctx.t('machine.machineSnapshots.currentStateTooltip')}
        >
          {ctx.t('machine.machineSnapshots.currentBadge')}
        </span>
      ) : null,
  },
  {
    key: 'holds',
    kind: 'count',
    labelKey: 'hosts.snapshots.column.holds',
    when: hasAny(row => row.holds !== undefined),
    value: holdsOf,
    render: (row, ctx) => <HoldsCell row={row} ctx={ctx} />,
  },
  {
    key: 'created',
    kind: 'date',
    labelKey: 'hosts.snapshots.column.created',
    when: hasAny(snapshotInstant),
    value: snapshotInstant,
    render: row => (row.created ? formatTaskDate(row.created) : ''),
  },
  {
    key: 'used',
    kind: 'size',
    labelKey: 'hosts.snapshots.column.used',
    when: hasAny(row => typeof row.used_bytes === 'number'),
    value: row => Number(row.used_bytes) || 0,
    render: row => (typeof row.used_bytes === 'number' ? formatByteSize(row.used_bytes) : ''),
  },
  {
    key: 'datasets',
    kind: 'count',
    labelKey: 'hosts.snapshots.column.datasets',
    priority: 6,
    when: hasAny(datasetCount),
    value: datasetCount,
    render: row => (
      <span
        title={holdHandles(row)
          .map(handle => handle.dataset)
          .join(', ')}
      >
        {datasetCount(row)}
      </span>
    ),
  },
  {
    key: 'description',
    kind: 'text',
    labelKey: 'hosts.snapshots.column.description',
    prose: true,
    when: hasAny(row => row.description),
    value: row => row.description || '',
  },
  {
    key: 'uuid',
    kind: 'text',
    labelKey: 'hosts.snapshots.column.uuid',
    priority: 9,
    defaultHidden: true,
    when: hasAny(row => row.uuid),
    value: row => row.uuid || '',
    render: row => (row.uuid ? <code className="small">{row.uuid}</code> : null),
  },
];

/**
 * The filter group of a machine's snapshots, its one enumerable column:
 * the state, the snapshot the machine derives from and the ones a hold
 * keeps.
 */
export const SNAPSHOT_FILTERS = [
  {
    key: 'state',
    labelKey: 'hosts.snapshots.filter.state',
    values: snapshotFlags,
    activeClass: 'bg-primary',
    labelFor: (value, t) => t(FLAG_LABELS[value]),
  },
];
