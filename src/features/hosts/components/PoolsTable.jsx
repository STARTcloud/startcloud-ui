import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { sortShape } from '../../../utils/itemShape';
import { formatBytes, healthTone, poolName, poolUsage, usageTone } from '../utils/StorageUtils';

import NetworkingTable from './NetworkingTable';
import { trendColumn } from './TrendCell';

const DEFAULT_DEDUP = '1.00x';

const NOT_AVAILABLE = 'N/A';

const badge = (tone, content) => <span className={`badge text-bg-${tone}`}>{content}</span>;

const healthWord = (row, ctx) => row.health || row.status || ctx.t('host.poolsTable.unknown');

/**
 * The columns of the pools table, hyperweaver-ui's: the pool, its health
 * in its tone, the size, the used and the available space, the sum and
 * the parts of the allocated and the free space the row carries, the
 * percent used in the tone of its fullness, the trend, the sparkline of
 * the pool's total I/O over the drawn range in the tone the host page's
 * pool chart gives the pool, the dedup ratio and the fragmentation.
 *
 * @param {Object} options - The page's side
 * @param {Object<string, Object>} options.pools - The points per pool of the `pool` chart's `series`
 * @returns {Array<Object>} The columns
 */
export const poolColumnsFor = ({ pools }) => [
  {
    key: 'pool',
    kind: 'name',
    labelKey: 'host.poolsTable.thPoolName',
    titleKey: 'host.poolsTable.sortByPoolNameTitle',
    value: poolName,
    render: row => <strong>{poolName(row)}</strong>,
  },
  {
    key: 'health',
    kind: 'badge',
    labelKey: 'host.poolsTable.thHealth',
    titleKey: 'host.poolsTable.sortByHealthTitle',
    value: healthWord,
    render: (row, ctx) => badge(healthTone(row.health || row.status), healthWord(row, ctx)),
  },
  {
    key: 'size',
    kind: 'size',
    labelKey: 'host.poolsTable.thSize',
    priority: 4,
    value: row => poolUsage(row).total,
    render: row => formatBytes(poolUsage(row).total),
  },
  {
    key: 'used',
    kind: 'size',
    labelKey: 'host.poolsTable.thUsed',
    priority: 3,
    value: row => poolUsage(row).alloc,
    render: row => formatBytes(poolUsage(row).alloc),
  },
  {
    key: 'available',
    kind: 'size',
    labelKey: 'host.poolsTable.thAvailable',
    priority: 3,
    value: row => poolUsage(row).free,
    render: row => formatBytes(poolUsage(row).free),
  },
  {
    key: 'usage',
    kind: 'badge',
    labelKey: 'host.poolsTable.thUsagePercent',
    value: row => poolUsage(row).percent,
    render: row => {
      const { percent } = poolUsage(row);
      return badge(usageTone(percent), `${percent}%`);
    },
  },
  trendColumn({ entities: pools, nameOf: poolName }),
  {
    key: 'dedup',
    kind: 'text',
    labelKey: 'host.poolsTable.thDedupRatio',
    priority: 6,
    value: row => row.dedup || row.dedupRatio || DEFAULT_DEDUP,
  },
  {
    key: 'fragmentation',
    kind: 'text',
    labelKey: 'host.poolsTable.thFragmentation',
    priority: 6,
    value: row => row.fragmentation || row.frag || NOT_AVAILABLE,
  },
];

/**
 * The pools table of the storage page, hyperweaver-ui's ZFS storage
 * pools card: the heading counting the pools, its button dropping the
 * sort a person chose, the chevron that folds it, and the one `SubTable`
 * of `columns` over the pools the page's one search binding left.
 */
const PoolsTable = ({ columns, table, reading, filtering, fold, ctx }) => {
  const { t } = useTranslation();
  return (
    <NetworkingTable
      panel="storage-pools"
      title={t('host.poolsTable.zfsStoragePoolsCount', { count: reading.rows.length })}
      columns={columns}
      table={table}
      rowKey={poolName}
      ctx={ctx}
      emptyKey="host.poolsTable.noPoolData"
      reading={reading}
      filtering={filtering}
      fold={fold}
      resetTitle={t('host.poolsTable.resetSortTitle')}
    />
  );
};

export const storageTableShape = PropTypes.shape({
  rows: PropTypes.array.isRequired,
  sort: sortShape.isRequired,
  setSort: PropTypes.func.isRequired,
  resetSort: PropTypes.func.isRequired,
  hiddenColumns: PropTypes.instanceOf(Set).isRequired,
  widths: PropTypes.objectOf(PropTypes.number).isRequired,
  setColumnWidth: PropTypes.func.isRequired,
});

export const storageReadingShape = PropTypes.shape({
  rows: PropTypes.array.isRequired,
  loaded: PropTypes.bool.isRequired,
  failed: PropTypes.bool.isRequired,
});

export const storageFoldShape = PropTypes.shape({
  folded: PropTypes.bool.isRequired,
  onFold: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
});

PoolsTable.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
  table: storageTableShape.isRequired,
  reading: storageReadingShape.isRequired,
  filtering: PropTypes.bool.isRequired,
  fold: storageFoldShape.isRequired,
  ctx: PropTypes.object.isRequired,
};

export default PoolsTable;
