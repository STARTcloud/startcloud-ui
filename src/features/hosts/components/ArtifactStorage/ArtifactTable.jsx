import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaTrash } from 'react-icons/fa6';

import Pager from '../../../../components/common/Pager';
import SubTable from '../../../../components/common/SubTable';
import { useSelection } from '../../../../hooks/useSelection';
import { useTablePrefs } from '../../../../hooks/useTablePrefs';
import { sortItems } from '../../../../utils/sort';

import { TRANSFER_COLUMNS, TransferRowActions } from './ArtifactDownloadRow';
import { ARTIFACT_COLUMNS, ArtifactRowActions } from './ArtifactRow';

const transferKey = row => row.taskId;

const artifactKey = row => String(row.id);

const EMPTY_KEYS = {
  loading: 'pages.loading',
  failed: 'hosts.overview.readError',
  filtered: 'pages.noMatches',
  empty: 'artifacts.artifactTable.noArtifactsFound',
};

const stateOf = ({ loaded, failed, filtering, rows }) => {
  if (!loaded) {
    return 'loading';
  }
  if (failed) {
    return 'failed';
  }
  if (rows > 0) {
    return 'rows';
  }
  return filtering ? 'filtered' : 'empty';
};

/**
 * The transfers in flight over the one table, drawn above the
 * artifacts while any is followed, its sort and widths kept under the
 * page's prefix.
 */
const Transfers = ({ transfers, ctx, prefsPrefix, onCancel }) => {
  const { t } = useTranslation();
  const prefs = useTablePrefs(`${prefsPrefix}_manage_artifact-transfers`, TRANSFER_COLUMNS);
  if (transfers.length === 0) {
    return null;
  }
  return (
    <div className="mb-3" data-table="artifact-transfers" data-count={transfers.length}>
      <p className="small text-muted mb-2">
        {t('artifacts.artifactManagement.downloadsInProgress', { count: transfers.length })}
      </p>
      <SubTable
        columns={TRANSFER_COLUMNS}
        rows={sortItems(transfers, prefs.sort, TRANSFER_COLUMNS, ctx)}
        rowKey={transferKey}
        RowActions={TransferRowActions}
        actionsProps={{ onCancel }}
        sort={prefs.sort}
        onSort={prefs.setSort}
        hiddenColumns={prefs.hiddenColumns}
        widths={prefs.widths}
        onResize={prefs.setColumnWidth}
        ctx={ctx}
        emptyText=""
      />
    </div>
  );
};

Transfers.propTypes = {
  transfers: PropTypes.array.isRequired,
  ctx: PropTypes.object.isRequired,
  prefsPrefix: PropTypes.string.isRequired,
  onCancel: PropTypes.func.isRequired,
};

/**
 * The artifacts of a host over the one table, hyperweaver-ui's: the
 * transfers in flight above it, the bulk bar with Delete selected while
 * rows are picked, the rows the page's binding left with a select
 * column, the row actions of `ArtifactRowActions`, and the page's
 * buttons under it, the agent paging twenty-five at a time; the loading
 * line, the read error, the no matches line or the empty line stand in
 * place of the rows, `data-state` naming which.
 */
const ArtifactTable = ({
  table,
  reading,
  filtering,
  ctx,
  transfers,
  pagination,
  busy,
  onAction,
  onDeleteMany,
  onPage,
  onCancelTransfer,
}) => {
  const { t } = useTranslation();
  const selection = useSelection(table.rows, {
    keyOf: artifactKey,
    labelOf: row => t('artifacts.artifactRow.selectLabel', { filename: row.filename }),
  });
  const state = stateOf({ ...reading, filtering, rows: table.rows.length });
  const totalPages = pagination.limit > 0 ? Math.ceil(pagination.total / pagination.limit) : 0;
  return (
    <div data-panel="artifact-list">
      <Transfers
        transfers={transfers}
        ctx={ctx}
        prefsPrefix={ctx.prefsPrefix}
        onCancel={onCancelTransfer}
      />
      {selection.someSelected ? (
        <div className="bulk-bar d-flex align-items-center gap-2 mb-3" data-note="artifact-bulk">
          <span>
            {t('artifacts.artifactTable.artifactsSelected', { count: selection.selected.size })}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-danger ms-auto"
            data-action="delete-selected"
            disabled={busy}
            onClick={() => {
              onDeleteMany([...selection.selected]);
              selection.clear();
            }}
          >
            <FaTrash className="me-1" aria-hidden="true" />
            {t('artifacts.artifactTable.deleteSelectedButton')}
          </button>
        </div>
      ) : null}
      <div data-table="artifacts" data-state={state}>
        <SubTable
          columns={ARTIFACT_COLUMNS}
          rows={table.rows}
          rowKey={artifactKey}
          RowActions={ArtifactRowActions}
          actionsProps={{ busy, onAction }}
          sort={table.sort}
          onSort={table.setSort}
          hiddenColumns={table.hiddenColumns}
          widths={table.widths}
          onResize={table.setColumnWidth}
          ctx={ctx}
          selection={selection.subtable}
          emptyText={t(EMPTY_KEYS[state] || EMPTY_KEYS.empty)}
          emptyBody={state === 'empty' ? t('artifacts.artifactTable.noArtifactsDescription') : null}
        />
      </div>
      <Pager
        page={pagination.limit > 0 ? Math.floor(pagination.offset / pagination.limit) : 0}
        totalPages={totalPages}
        hasNext={Boolean(pagination.has_more)}
        size={pagination.limit}
        total={pagination.total}
        onChange={page => onPage(page * pagination.limit)}
      />
    </div>
  );
};

ArtifactTable.propTypes = {
  table: PropTypes.shape({
    rows: PropTypes.array.isRequired,
    sort: PropTypes.array.isRequired,
    setSort: PropTypes.func.isRequired,
    hiddenColumns: PropTypes.instanceOf(Set).isRequired,
    widths: PropTypes.objectOf(PropTypes.number).isRequired,
    setColumnWidth: PropTypes.func.isRequired,
  }).isRequired,
  reading: PropTypes.shape({
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
  ctx: PropTypes.shape({ prefsPrefix: PropTypes.string.isRequired }).isRequired,
  transfers: PropTypes.array.isRequired,
  pagination: PropTypes.shape({
    total: PropTypes.number,
    limit: PropTypes.number,
    offset: PropTypes.number,
    has_more: PropTypes.bool,
  }).isRequired,
  busy: PropTypes.bool.isRequired,
  onAction: PropTypes.func.isRequired,
  onDeleteMany: PropTypes.func.isRequired,
  onPage: PropTypes.func.isRequired,
  onCancelTransfer: PropTypes.func.isRequired,
};

export default ArtifactTable;
