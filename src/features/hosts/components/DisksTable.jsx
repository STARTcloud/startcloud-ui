import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { hasAny } from '../../../components/common/SubTable';
import { diskKey, diskName, formatBytes, healthTone, temperatureTone } from '../utils/StorageUtils';

import NetworkingTable from './NetworkingTable';
import { storageFoldShape, storageReadingShape, storageTableShape } from './PoolsTable';
import { trendColumn } from './TrendCell';

const badge = (tone, content) => <span className={`badge text-bg-${tone}`}>{content}</span>;

const notAvailable = ctx => ctx.t('host.disksTable.notAvailable');

const modelWord = (row, ctx) => row.model || row.product || notAvailable(ctx);

const serialWord = (row, ctx) =>
  row.serial_number || row.serial || row.serialNumber || notAvailable(ctx);

const capacityOf = row =>
  Number(row.capacity_bytes) || Number(row.size) || Number(row.capacity) || 0;

const typeWord = (row, ctx) =>
  row.disk_type || row.type || row.mediaType || ctx.t('host.disksTable.unknown');

const healthWord = (row, ctx) => row.health || row.status || ctx.t('host.disksTable.unknown');

const temperatureOf = row => Number(row.temperature) || 0;

const poolWord = (row, ctx) => {
  if (row.pool_assignment || row.pool) {
    return row.pool_assignment || row.pool;
  }
  return ctx.t(
    row.is_available ? 'host.disksTable.availableStatus' : 'host.disksTable.unassignedStatus'
  );
};

const PoolCell = ({ row, ctx }) => {
  if (row.pool_assignment || row.pool) {
    return <strong>{row.pool_assignment || row.pool}</strong>;
  }
  return <span className="text-muted">{poolWord(row, ctx)}</span>;
};

PoolCell.propTypes = {
  row: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
};

const TemperatureCell = ({ row, ctx }) => {
  const degrees = temperatureOf(row);
  if (!degrees) {
    return badge('info', notAvailable(ctx));
  }
  return badge(temperatureTone(degrees), `${degrees}°C`);
};

TemperatureCell.propTypes = {
  row: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
};

/**
 * The columns of the disks table, hyperweaver-ui's: the device, the
 * model, the serial, the size, the type and the health in their tones,
 * the temperature in the tone of its heat, drawn only while a row
 * carries one, the pool the disk belongs to, its availability where it
 * belongs to none, and the trend, the sparkline of the device's total I/O
 * over the drawn range in the tone the summary charts give the device, a
 * dash for a disk with no I/O sample.
 *
 * @param {Object} options - The page's side
 * @param {Object<string, Object>} options.devices - The points per device of the `disk-io` chart's `series`
 * @returns {Array<Object>} The columns
 */
export const diskColumnsFor = ({ devices }) => [
  {
    key: 'device',
    kind: 'name',
    labelKey: 'host.disksTable.deviceHeader',
    titleKey: 'host.disksTable.sortDeviceTitle',
    value: diskName,
    render: row => <strong>{diskName(row)}</strong>,
  },
  {
    key: 'model',
    kind: 'text',
    labelKey: 'host.disksTable.modelHeader',
    titleKey: 'host.disksTable.sortModelTitle',
    priority: 5,
    value: modelWord,
  },
  {
    key: 'serial',
    kind: 'text',
    labelKey: 'host.disksTable.serialHeader',
    titleKey: 'host.disksTable.sortSerialTitle',
    priority: 6,
    value: serialWord,
    render: (row, ctx) => <code className="small">{serialWord(row, ctx)}</code>,
  },
  {
    key: 'size',
    kind: 'size',
    labelKey: 'host.disksTable.sizeHeader',
    titleKey: 'host.disksTable.sortSizeTitle',
    value: capacityOf,
    render: row => formatBytes(capacityOf(row)),
  },
  {
    key: 'type',
    kind: 'badge',
    labelKey: 'host.disksTable.typeHeader',
    titleKey: 'host.disksTable.sortTypeTitle',
    priority: 3,
    value: typeWord,
    render: (row, ctx) => badge('info', typeWord(row, ctx)),
  },
  {
    key: 'health',
    kind: 'badge',
    labelKey: 'host.disksTable.healthHeader',
    titleKey: 'host.disksTable.sortHealthTitle',
    value: healthWord,
    render: (row, ctx) => badge(healthTone(row.health || row.status), healthWord(row, ctx)),
  },
  {
    key: 'temperature',
    kind: 'badge',
    labelKey: 'host.disksTable.temperatureHeader',
    titleKey: 'host.disksTable.sortTemperatureTitle',
    priority: 4,
    when: hasAny(temperatureOf),
    value: temperatureOf,
    render: (row, ctx) => <TemperatureCell row={row} ctx={ctx} />,
  },
  {
    key: 'pool',
    kind: 'text',
    labelKey: 'host.disksTable.poolHeader',
    titleKey: 'host.disksTable.sortPoolTitle',
    priority: 2,
    value: poolWord,
    render: (row, ctx) => <PoolCell row={row} ctx={ctx} />,
  },
  trendColumn({ entities: devices, nameOf: diskName }),
];

/**
 * The disks table of the storage page, hyperweaver-ui's physical disks
 * card: the heading counting the disks, its button dropping the sort a
 * person chose, the chevron that folds it, and the one `SubTable` of
 * `columns` over the disks the page's one search binding left.
 */
const DisksTable = ({ columns, table, reading, filtering, fold, ctx }) => {
  const { t } = useTranslation();
  return (
    <NetworkingTable
      panel="storage-disks"
      title={t('host.disksTable.titleWithCount', { count: reading.rows.length })}
      columns={columns}
      table={table}
      rowKey={diskKey}
      ctx={ctx}
      emptyKey="host.disksTable.empty"
      reading={reading}
      filtering={filtering}
      fold={fold}
      resetTitle={t('host.disksTable.resetSortTitle')}
    />
  );
};

DisksTable.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
  table: storageTableShape.isRequired,
  reading: storageReadingShape.isRequired,
  filtering: PropTypes.bool.isRequired,
  fold: storageFoldShape.isRequired,
  ctx: PropTypes.object.isRequired,
};

export default DisksTable;
