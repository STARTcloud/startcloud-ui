import PropTypes from 'prop-types';
import { useCallback, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  FaArrowDownWideShort,
  FaArrowUpShortWide,
  FaCaretDown,
  FaCaretRight,
  FaChevronLeft,
  FaChevronRight,
  FaTable,
} from 'react-icons/fa6';

import SubTable from '../../../components/common/SubTable';
import { useStatus } from '../../../contexts/StatusContext';
import { nextSort, sortItems } from '../../../utils/sort';
import { fetchDatabaseRows, fetchDatabaseTables } from '../api/database';
import { useManageRead } from '../hooks/useHostManage';
import {
  PAGE_SIZE,
  countOf,
  databaseFiles,
  databaseSize,
  fileName,
  formatDatabaseBytes,
  orderOf,
  pageRange,
} from '../utils/database';

const NO_HIDDEN = new Set();

const NAME_SORT = [{ column: 'name', direction: 'asc' }];

/**
 * The columns of the databases table: the name, the size, the counts of
 * tables and indexes, and the files with their sizes.
 */
export const DATABASE_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'host.databasePanel.title',
    value: row => row.name || '',
    render: row => <strong>{row.name}</strong>,
  },
  {
    key: 'size',
    kind: 'size',
    labelKey: 'host.databasePanel.totalSize',
    value: row => databaseSize(row) || 0,
    render: row => {
      const size = databaseSize(row);
      return size === null ? (
        ''
      ) : (
        <span className="badge text-bg-info">{formatDatabaseBytes(size)}</span>
      );
    },
  },
  {
    key: 'tables',
    kind: 'count',
    labelKey: 'host.databasePanel.tables',
    value: row => countOf(row.tables) || 0,
    render: (row, ctx) => {
      const count = countOf(row.tables);
      return count === null ? '' : ctx.t('host.databasePanel.tablesCount', { count });
    },
  },
  {
    key: 'indexes',
    kind: 'count',
    labelKey: 'host.databasePanel.colIndexes',
    priority: 4,
    value: row => countOf(row.indexes) || 0,
    render: (row, ctx) => {
      const count = countOf(row.indexes);
      return count === null ? '' : ctx.t('host.databasePanel.indexesCount', { count });
    },
  },
  {
    key: 'files',
    kind: 'badges',
    labelKey: 'hosts.manage.database.files',
    priority: 5,
    value: row => databaseFiles(row).map(fileName).join(', '),
    render: row => (
      <span className="d-inline-flex flex-wrap gap-1">
        {databaseFiles(row).map(file => (
          <span key={fileName(file)} className="badge text-bg-secondary">
            {fileName(file)} · {formatDatabaseBytes(file.size)}
          </span>
        ))}
      </span>
    ),
    when: rows => rows.some(row => databaseFiles(row).length > 0),
  },
];

/**
 * The action of one row of the databases table: Explore, which opens the
 * database's tables under its own row, pressed while it is the one
 * explored.
 */
export const DatabaseRowActions = ({ row, expanded, onToggle }) => {
  const { t } = useTranslation();
  const open = expanded === row.name;
  const Icon = open ? FaCaretDown : FaCaretRight;
  const label = t(
    open ? 'host.databasePanel.collapseDatabase' : 'host.databasePanel.exploreDatabase',
    {
      name: row.name,
    }
  );
  return (
    <button
      type="button"
      className={`btn btn-sm btn-${open ? 'primary' : 'outline-secondary'}`}
      data-action="database-explore"
      data-database={row.name}
      aria-pressed={open}
      aria-label={label}
      title={label}
      onClick={() => onToggle(row.name)}
    >
      <Icon aria-hidden="true" />
    </button>
  );
};

DatabaseRowActions.propTypes = {
  row: PropTypes.shape({ name: PropTypes.string.isRequired }).isRequired,
  expanded: PropTypes.string,
  onToggle: PropTypes.func.isRequired,
};

const TABLE_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'host.databasePanel.colTable',
    value: row => row.name || '',
    render: row => <code className="small">{row.name}</code>,
  },
  {
    key: 'rows',
    kind: 'count',
    labelKey: 'host.databasePanel.colRows',
    value: row => Number(row.rows ?? 0),
    render: (row, ctx) => Number(row.rows ?? 0).toLocaleString(ctx.language),
  },
  {
    key: 'indexes',
    kind: 'count',
    labelKey: 'host.databasePanel.colIndexes',
    value: row => countOf(row.indexes) || 0,
    render: row => countOf(row.indexes) ?? '—',
  },
];

const BrowseAction = ({ row, database, onBrowse }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-info"
      data-action="database-browse"
      data-table={row.name}
      title={t('host.databasePanel.browseRowsTitle')}
      onClick={() => onBrowse(database, row.name)}
    >
      <FaTable className="me-1" aria-hidden="true" />
      {t('host.databasePanel.browse')}
    </button>
  );
};

BrowseAction.propTypes = {
  row: PropTypes.shape({ name: PropTypes.string.isRequired }).isRequired,
  database: PropTypes.string.isRequired,
  onBrowse: PropTypes.func.isRequired,
};

/**
 * The tables of one explored database, drawn as the detail row of its
 * row in the databases table: `row` is the database's row, the tables
 * read once when it is explored and again on the page's Refresh, each
 * table's Browse calling `onBrowse(database, table)`.
 */
export const DatabaseTables = ({ id, row: record, ctx, onBrowse }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const database = record.name;
  const [sort, setSort] = useState(NAME_SORT);
  const reading = useManageRead(
    useCallback(() => fetchDatabaseTables(status, id, database), [status, id, database]),
    true
  );
  return (
    <div className="mt-3" data-panel="database-tables" data-database={database}>
      <h6 className="fw-bold">{database}</h6>
      {reading.loaded ? null : (
        <p className="text-muted small">{t('host.databasePanel.loadingTables')}</p>
      )}
      {reading.failed ? (
        <div className="alert alert-danger" role="alert">
          {t('host.databasePanel.listTablesFailed', { name: database, message: reading.message })}
        </div>
      ) : null}
      {reading.loaded && !reading.failed ? (
        <div data-table="database-tables">
          <SubTable
            columns={TABLE_COLUMNS}
            rows={sortItems(reading.data || [], sort, TABLE_COLUMNS, ctx)}
            rowKey={row => row.name}
            RowActions={BrowseAction}
            actionsProps={{ database, onBrowse }}
            sort={sort}
            onSort={(column, options) => setSort(current => nextSort(current, column, options))}
            hiddenColumns={NO_HIDDEN}
            ctx={ctx}
            emptyText={t('host.databasePanel.noTablesReported')}
          />
        </div>
      ) : null}
    </div>
  );
};

DatabaseTables.propTypes = {
  id: PropTypes.string.isRequired,
  row: PropTypes.shape({ name: PropTypes.string.isRequired }).isRequired,
  ctx: PropTypes.object.isRequired,
  onBrowse: PropTypes.func.isRequired,
};

/**
 * The read-only row browser of one table, a list dialog: fifty rows a
 * page from `GET database/{name}/tables/{table}/rows`, the order by one
 * column the agent validates and its direction, the page's range and
 * the two pagers; the UI never sends SQL.
 */
export const TableBrowserModal = ({ id, database, table, onClose }) => {
  const { t } = useTranslation();
  const status = useStatus();
  const [offset, setOffset] = useState(0);
  const [orderBy, setOrderBy] = useState('');
  const [desc, setDesc] = useState(false);
  const reading = useManageRead(
    useCallback(
      () =>
        fetchDatabaseRows(status, id, {
          database,
          table,
          limit: PAGE_SIZE,
          offset,
          orderBy: orderOf(orderBy, desc),
        }),
      [status, id, database, table, offset, orderBy, desc]
    ),
    true
  );
  const columns = Array.isArray(reading.data?.columns) ? reading.data.columns : [];
  const rows = Array.isArray(reading.data?.rows) ? reading.data.rows : [];
  const total = reading.data?.total ?? 0;
  const { from, to } = pageRange(offset, total);
  const OrderIcon = desc ? FaArrowDownWideShort : FaArrowUpShortWide;

  return (
    <Modal
      show
      onHide={onClose}
      dialogClassName="list-modal"
      scrollable
      data-dialog="database-rows"
    >
      <Modal.Header closeButton>
        <Modal.Title as="h5">
          {database} · {table}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
          <label className="small text-muted" htmlFor="db-browse-orderby">
            {t('host.databasePanel.orderBy')}
          </label>
          <select
            id="db-browse-orderby"
            className="form-select form-select-sm w-auto"
            value={orderBy}
            onChange={event => {
              setOrderBy(event.target.value);
              setOffset(0);
            }}
          >
            <option value="">{t('host.databasePanel.tableOrder')}</option>
            {columns.map(column => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
          {orderBy ? (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              data-action="database-order"
              title={t(
                desc ? 'host.databasePanel.sortDescTitle' : 'host.databasePanel.sortAscTitle'
              )}
              onClick={() => {
                setDesc(current => !current);
                setOffset(0);
              }}
            >
              <OrderIcon aria-hidden="true" />
            </button>
          ) : null}
          <span className="ms-auto d-flex align-items-center gap-2 small">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              data-action="database-previous"
              aria-label={t('host.databasePanel.previousPage')}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
            >
              <FaChevronLeft aria-hidden="true" />
            </button>
            <span className="text-nowrap" data-range={`${from}-${to}`}>
              {t('host.databasePanel.pageRange', { from, to, total: total.toLocaleString() })}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              data-action="database-next"
              aria-label={t('host.databasePanel.nextPage')}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={to >= total}
            >
              <FaChevronRight aria-hidden="true" />
            </button>
          </span>
        </div>
        {reading.failed ? (
          <div className="alert alert-danger py-2" role="alert">
            {reading.message}
          </div>
        ) : null}
        {reading.loaded ? null : (
          <p className="text-muted mb-0">{t('host.databasePanel.loading')}</p>
        )}
        {reading.loaded && !reading.failed ? (
          <div className="table-responsive zfs-properties">
            <table className="table table-sm table-striped small">
              <thead>
                <tr>
                  {columns.map(column => (
                    <th scope="col" key={column} className="text-nowrap">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={`row-${offset + rowIndex}`}>
                    {row.map((cell, cellIndex) => {
                      const text = cell === null || cell === undefined ? '' : String(cell);
                      return (
                        <td
                          key={columns[cellIndex] || cellIndex}
                          className="text-nowrap"
                          title={text}
                        >
                          {text}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(columns.length, 1)} className="text-muted">
                      {t('host.databasePanel.noRows')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </Modal.Body>
    </Modal>
  );
};

TableBrowserModal.propTypes = {
  id: PropTypes.string.isRequired,
  database: PropTypes.string.isRequired,
  table: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};
