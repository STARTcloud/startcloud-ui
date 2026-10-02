import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { datasetName, formatBytes, parseSize } from '../utils/StorageUtils';

import NetworkingTable from './NetworkingTable';
import { storageFoldShape, storageReadingShape, storageTableShape } from './PoolsTable';

const badge = (tone, content) => <span className={`badge text-bg-${tone}`}>{content}</span>;

const bytesOf = (row, bytes, human) => Number(row[bytes]) || parseSize(row[human]);

const typeWord = (row, ctx) => row.type || ctx.t('host.datasetsTable.filesystemType');

const compressionWord = (row, ctx) =>
  row.compression || row.compressRatio || ctx.t('host.datasetsTable.compressionOff');

const mountWord = (row, ctx) =>
  row.mountpoint || row.mount || ctx.t('host.datasetsTable.notAvailable');

/**
 * The columns of the datasets table, hyperweaver-ui's: the name, the
 * type, the used, the available and the referenced space, each read
 * from the `*_bytes` member where the row carries one and the human
 * size otherwise, the compression and the mountpoint.
 */
export const DATASET_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'host.datasetsTable.nameHeader',
    titleKey: 'host.datasetsTable.sortNameTitle',
    value: datasetName,
    render: row => <code className="small">{datasetName(row)}</code>,
  },
  {
    key: 'type',
    kind: 'badge',
    labelKey: 'host.datasetsTable.typeHeader',
    titleKey: 'host.datasetsTable.sortTypeTitle',
    value: typeWord,
    render: (row, ctx) => badge('info', typeWord(row, ctx)),
  },
  {
    key: 'used',
    kind: 'size',
    labelKey: 'host.datasetsTable.usedHeader',
    titleKey: 'host.datasetsTable.sortUsedTitle',
    value: row => bytesOf(row, 'used_bytes', 'used'),
    render: row => formatBytes(bytesOf(row, 'used_bytes', 'used')),
  },
  {
    key: 'available',
    kind: 'size',
    labelKey: 'host.datasetsTable.availableHeader',
    titleKey: 'host.datasetsTable.sortAvailableTitle',
    priority: 3,
    value: row => bytesOf(row, 'available_bytes', 'available'),
    render: row => formatBytes(bytesOf(row, 'available_bytes', 'available')),
  },
  {
    key: 'referenced',
    kind: 'size',
    labelKey: 'host.datasetsTable.referencedHeader',
    titleKey: 'host.datasetsTable.sortReferencedTitle',
    priority: 4,
    value: row => bytesOf(row, 'referenced_bytes', 'referenced'),
    render: row => formatBytes(bytesOf(row, 'referenced_bytes', 'referenced')),
  },
  {
    key: 'compression',
    kind: 'badge',
    labelKey: 'host.datasetsTable.compressionHeader',
    titleKey: 'host.datasetsTable.sortCompressionTitle',
    priority: 5,
    value: compressionWord,
    render: (row, ctx) => badge('secondary', compressionWord(row, ctx)),
  },
  {
    key: 'mountpoint',
    kind: 'text',
    labelKey: 'host.datasetsTable.mountpointHeader',
    titleKey: 'host.datasetsTable.sortMountpointTitle',
    priority: 6,
    value: mountWord,
    render: (row, ctx) => <code className="small">{mountWord(row, ctx)}</code>,
  },
];

/**
 * The datasets table of the storage page, hyperweaver-ui's ZFS datasets
 * card: the heading counting the datasets, its button dropping the sort
 * a person chose, the chevron that folds it, and the one `SubTable` over
 * the datasets the page's one search binding left.
 */
const DatasetsTable = ({ table, reading, filtering, fold, ctx }) => {
  const { t } = useTranslation();
  return (
    <NetworkingTable
      panel="storage-datasets"
      title={t('host.datasetsTable.titleWithCount', { count: reading.rows.length })}
      columns={DATASET_COLUMNS}
      table={table}
      rowKey={datasetName}
      ctx={ctx}
      emptyKey="host.datasetsTable.empty"
      reading={reading}
      filtering={filtering}
      fold={fold}
      resetTitle={t('host.datasetsTable.resetSortTitle')}
    />
  );
};

DatasetsTable.propTypes = {
  table: storageTableShape.isRequired,
  reading: storageReadingShape.isRequired,
  filtering: PropTypes.bool.isRequired,
  fold: storageFoldShape.isRequired,
  ctx: PropTypes.object.isRequired,
};

export default DatasetsTable;
