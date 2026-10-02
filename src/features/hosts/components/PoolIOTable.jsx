import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { formatIoRate, ioRates, poolTypeTone } from '../utils/StorageUtils';

import NetworkingTable from './NetworkingTable';
import { storageFoldShape, storageReadingShape, storageTableShape } from './PoolsTable';

const badge = (tone, content) => <span className={`badge text-bg-${tone}`}>{content}</span>;

const waits = (row, read, write) => `R: ${row[read] ?? '-'}, W: ${row[write] ?? '-'}`;

const timeWord = (row, ctx) =>
  row.scan_timestamp ? new Date(row.scan_timestamp).toLocaleTimeString(ctx.language) : '';

/**
 * The columns of the pool I/O table, hyperweaver-ui's: the pool, its
 * type in its tone, the allocation and the free space, the read and the
 * write operations and rates, the total and the disk waits, read and
 * write together, and the instant of the sample.
 */
export const POOL_IO_COLUMNS = [
  {
    key: 'pool',
    kind: 'name',
    labelKey: 'host.poolIOTable.pool',
    value: row => row.pool || '',
    render: row => <strong>{row.pool}</strong>,
  },
  {
    key: 'type',
    kind: 'badge',
    labelKey: 'host.poolIOTable.type',
    priority: 3,
    value: row => row.pool_type || '',
    render: row => (row.pool_type ? badge(poolTypeTone(row.pool_type), row.pool_type) : null),
  },
  {
    key: 'alloc',
    kind: 'text',
    labelKey: 'host.poolIOTable.allocation',
    priority: 5,
    value: row => row.alloc || '',
  },
  {
    key: 'free',
    kind: 'text',
    labelKey: 'host.poolIOTable.freeSpace',
    priority: 5,
    value: row => row.free || '',
  },
  {
    key: 'readOps',
    kind: 'badge',
    labelKey: 'host.poolIOTable.readOps',
    priority: 4,
    value: row => Number(row.read_ops) || 0,
    render: row => badge('info', row.read_ops ?? 0),
  },
  {
    key: 'writeOps',
    kind: 'badge',
    labelKey: 'host.poolIOTable.writeOps',
    priority: 4,
    value: row => Number(row.write_ops) || 0,
    render: row => badge('warning', row.write_ops ?? 0),
  },
  {
    key: 'read',
    kind: 'badge',
    labelKey: 'host.poolIOTable.readBandwidth',
    value: row => ioRates(row).read,
    render: row => badge('info', formatIoRate(ioRates(row).read)),
  },
  {
    key: 'write',
    kind: 'badge',
    labelKey: 'host.poolIOTable.writeBandwidth',
    value: row => ioRates(row).write,
    render: row => badge('warning', formatIoRate(ioRates(row).write)),
  },
  {
    key: 'totalWait',
    kind: 'text',
    labelKey: 'host.poolIOTable.totalWait',
    priority: 6,
    value: row => waits(row, 'total_wait_read', 'total_wait_write'),
    render: row => (
      <span className="text-muted small">{waits(row, 'total_wait_read', 'total_wait_write')}</span>
    ),
  },
  {
    key: 'diskWait',
    kind: 'text',
    labelKey: 'host.poolIOTable.diskWait',
    priority: 6,
    value: row => waits(row, 'disk_wait_read', 'disk_wait_write'),
    render: row => (
      <span className="text-muted small">{waits(row, 'disk_wait_read', 'disk_wait_write')}</span>
    ),
  },
  {
    key: 'updated',
    kind: 'date',
    labelKey: 'host.poolIOTable.lastUpdated',
    priority: 5,
    value: row => new Date(row.scan_timestamp || 0).getTime() || 0,
    render: (row, ctx) => <span className="text-muted small">{timeWord(row, ctx)}</span>,
  },
];

/**
 * The pool I/O table of the storage page, hyperweaver-ui's card: the
 * heading counting the pools, the chevron that folds it, and the one
 * `SubTable` over the newest sample of each pool the page's one search
 * binding left.
 */
const PoolIOTable = ({ table, reading, filtering, fold, ctx }) => {
  const { t } = useTranslation();
  return (
    <NetworkingTable
      panel="storage-pool-io"
      title={t('host.poolIOTable.title', { count: reading.rows.length })}
      columns={POOL_IO_COLUMNS}
      table={table}
      rowKey={row => String(row.pool)}
      ctx={ctx}
      emptyKey="host.storageCharts.noData"
      reading={reading}
      filtering={filtering}
      fold={fold}
    />
  );
};

PoolIOTable.propTypes = {
  table: storageTableShape.isRequired,
  reading: storageReadingShape.isRequired,
  filtering: PropTypes.bool.isRequired,
  fold: storageFoldShape.isRequired,
  ctx: PropTypes.object.isRequired,
};

export default PoolIOTable;
