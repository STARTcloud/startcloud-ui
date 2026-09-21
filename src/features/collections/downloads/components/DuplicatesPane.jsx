import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaXmark } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import ChecksumCell from '../../../../components/common/ChecksumCell';
import EmptyState from '../../../../components/common/EmptyState';
import SubTable from '../../../../components/common/SubTable';
import { architecturePath } from '../../../../utils/routes';
import { nextSort, sortItems } from '../../../../utils/sort';
import { downloadsAdapter } from '../api/adapter';

const NO_HIDDEN = new Set();

const rowKey = row => [row.product, row.release, row.patch, row.name].join('/');

const originalWord = (row, ctx) => (row.original ? ctx.t('downloads.duplicates.original') : '');

const COLUMNS = [
  {
    key: 'checksum',
    kind: 'checksum',
    labelKey: 'pages.table.checksum',
    value: row => row.checksum,
    render: row => <ChecksumCell checksum={row.checksum} checksumType={row.checksumType} />,
  },
  {
    key: 'name',
    kind: 'name',
    labelKey: 'pages.table.name',
    value: row => row.fileName || row.name,
    render: (row, ctx) => (
      <Link
        to={architecturePath(
          ctx.collection,
          ctx.org,
          row.product,
          row.release,
          row.patch,
          row.name
        )}
      >
        {row.fileName || row.name}
      </Link>
    ),
  },
  {
    key: 'where',
    kind: 'text',
    labelKey: 'downloads.duplicates.where',
    value: row => `${row.product} / ${row.release} / ${row.patch}`,
  },
  {
    key: 'copies',
    kind: 'count',
    labelKey: 'downloads.duplicates.copies',
    value: row => row.copies,
  },
  {
    key: 'size',
    kind: 'size',
    labelKey: 'pages.table.fileSize',
    value: row => row.fileSize,
    render: (row, ctx) => ctx.formatFileSize(row.fileSize),
  },
  {
    key: 'original',
    kind: 'badge',
    labelKey: 'downloads.duplicates.original',
    value: originalWord,
    render: (row, ctx) =>
      row.original ? <span className="badge bg-success">{originalWord(row, ctx)}</span> : '',
  },
];

const DEFAULT_SORT = [{ column: 'checksum', direction: 'asc' }];

/**
 * The Duplicates view of an organization's downloads, drawn full width
 * under the heading row the way the placing form is: every file whose
 * checksum another file carries, one row per file linking to its own
 * address, the rows sorted by checksum so a group's copies sit together,
 * the group's copy count and the original flag beside each; the header
 * sort is the table's own, every column sorting by the text its cell
 * shows, and the navbar search stays the listing's.
 */
const DuplicatesPane = ({ org, ctx, onClose }) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState(null);
  const [sort, setSort] = useState(DEFAULT_SORT);

  useEffect(() => {
    let mounted = true;
    downloadsAdapter
      .duplicates(org)
      .then(loaded => {
        if (mounted) {
          setRows(loaded);
        }
      })
      .catch(() => {
        if (mounted) {
          setRows([]);
        }
      });
    return () => {
      mounted = false;
    };
  }, [org]);

  const sorted = useMemo(
    () => (rows ? sortItems(rows, sort, COLUMNS, ctx) : []),
    [rows, sort, ctx]
  );

  return (
    <div className="w-100 order-last">
      <div className="d-flex align-items-center gap-2 mb-2">
        <h3 className="h6 mb-0 me-auto">{t('downloads.duplicates.title')}</h3>
        <button
          type="button"
          className="navbar-search-tool"
          onClick={onClose}
          title={t('boxes.buttons.close')}
          aria-label={t('boxes.buttons.close')}
        >
          <FaXmark />
        </button>
      </div>
      {rows === null ? <div>{t('pages.loading')}</div> : null}
      {rows && rows.length === 0 ? (
        <EmptyState title={t('downloads.duplicates.none')} className="empty-state-sm" />
      ) : null}
      {rows && rows.length > 0 ? (
        <SubTable
          columns={COLUMNS}
          rows={sorted}
          rowKey={rowKey}
          sort={sort}
          onSort={(column, options) => setSort(current => nextSort(current, column, options))}
          hiddenColumns={NO_HIDDEN}
          ctx={ctx}
          emptyText={t('downloads.duplicates.none')}
        />
      ) : null}
    </div>
  );
};

DuplicatesPane.propTypes = {
  org: PropTypes.string.isRequired,
  ctx: PropTypes.shape({
    collection: PropTypes.object.isRequired,
    org: PropTypes.string.isRequired,
    formatFileSize: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DuplicatesPane;
