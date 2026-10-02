import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { formatIoRate, ioRates, ioTone } from '../utils/StorageUtils';

import NetworkingTable from './NetworkingTable';
import { storageFoldShape, storageReadingShape, storageTableShape } from './PoolsTable';

const badge = (tone, content) => <span className={`badge text-bg-${tone}`}>{content}</span>;

const timeWord = (row, ctx) =>
  row.scan_timestamp ? new Date(row.scan_timestamp).toLocaleTimeString(ctx.language) : '';

/**
 * The columns of the disk I/O table, hyperweaver-ui's: the device, its
 * pool, the read and the write operations, the read and the write rate,
 * the total rate in the tone of its size and the instant of the sample.
 */
export const DISK_IO_COLUMNS = [
  {
    key: 'device',
    kind: 'name',
    labelKey: 'host.diskIOTable.deviceHeader',
    value: row => row.device_name || '',
    render: row => <strong>{row.device_name}</strong>,
  },
  {
    key: 'pool',
    kind: 'badge',
    labelKey: 'host.diskIOTable.poolHeader',
    priority: 3,
    value: row => row.pool || '',
    render: row => (row.pool ? badge('primary', row.pool) : null),
  },
  {
    key: 'readOps',
    kind: 'count',
    labelKey: 'host.diskIOTable.readOpsHeader',
    priority: 4,
    value: row => Number(row.read_ops) || 0,
  },
  {
    key: 'writeOps',
    kind: 'count',
    labelKey: 'host.diskIOTable.writeOpsHeader',
    priority: 4,
    value: row => Number(row.write_ops) || 0,
  },
  {
    key: 'read',
    kind: 'badge',
    labelKey: 'host.diskIOTable.readBandwidthHeader',
    priority: 3,
    value: row => ioRates(row).read,
    render: row => badge('info', formatIoRate(ioRates(row).read)),
  },
  {
    key: 'write',
    kind: 'badge',
    labelKey: 'host.diskIOTable.writeBandwidthHeader',
    priority: 3,
    value: row => ioRates(row).write,
    render: row => badge('warning', formatIoRate(ioRates(row).write)),
  },
  {
    key: 'total',
    kind: 'badge',
    labelKey: 'host.diskIOTable.totalIoHeader',
    value: row => ioRates(row).total,
    render: row => {
      const { total } = ioRates(row);
      return badge(ioTone(total), formatIoRate(total));
    },
  },
  {
    key: 'updated',
    kind: 'date',
    labelKey: 'host.diskIOTable.lastUpdatedHeader',
    priority: 5,
    value: row => new Date(row.scan_timestamp || 0).getTime() || 0,
    render: (row, ctx) => <span className="text-muted small">{timeWord(row, ctx)}</span>,
  },
];

/**
 * The disk I/O table of the storage page, hyperweaver-ui's card: the
 * heading counting the devices, its button dropping the sort a person
 * chose, the chevron that folds it, and the one `SubTable` over the
 * newest sample of each device the page's one search binding left, the
 * busiest device first until a header sorts it.
 */
const DiskIOTable = ({ table, reading, filtering, fold, ctx }) => {
  const { t } = useTranslation();
  return (
    <NetworkingTable
      panel="storage-disk-io"
      title={t('host.diskIOTable.titleWithCount', { count: reading.rows.length })}
      columns={DISK_IO_COLUMNS}
      table={table}
      rowKey={row => String(row.device_name)}
      ctx={ctx}
      emptyKey="host.diskIOTable.empty"
      reading={reading}
      filtering={filtering}
      fold={fold}
      resetTitle={t('host.diskIOTable.resetSortTitle')}
    />
  );
};

DiskIOTable.propTypes = {
  table: storageTableShape.isRequired,
  reading: storageReadingShape.isRequired,
  filtering: PropTypes.bool.isRequired,
  fold: storageFoldShape.isRequired,
  ctx: PropTypes.object.isRequired,
};

export default DiskIOTable;
