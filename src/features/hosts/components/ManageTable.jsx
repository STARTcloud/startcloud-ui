import PropTypes from 'prop-types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import SubTable from '../../../components/common/SubTable';
import { sortShape } from '../../../utils/itemShape';
import { nextSort, sortItems } from '../../../utils/sort';

const NO_HIDDEN = new Set();

const NO_PROPS = {};

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

const EMPTY_KEYS = {
  loading: 'pages.loading',
  failed: 'hosts.overview.readError',
  filtered: 'pages.noMatches',
};

/**
 * One table of a page of a host: the `SubTable` over the rows the page's
 * search leaves, in the table's own sort, hidden columns and widths, the
 * row the URL's hash names brought into view, `data-table` naming the
 * table and `data-state` whether it is loading, failed, filtered, empty
 * or drawing rows.
 */
const ManageTable = ({
  name,
  columns,
  table,
  rowKey,
  rowProp = 'row',
  RowActions = null,
  actionsProps = NO_PROPS,
  Detail = null,
  detailProps = NO_PROPS,
  expandedKeys = null,
  ctx,
  emptyKey,
  reading,
  filtering,
}) => {
  const { t } = useTranslation();
  const state = stateOf({ ...reading, filtering, rows: table.rows.length });
  return (
    <div data-table={name} data-state={state}>
      <SubTable
        columns={columns}
        rows={table.rows}
        rowKey={rowKey}
        rowRef={table.rowRef || null}
        rowProp={rowProp}
        RowActions={RowActions}
        actionsProps={actionsProps}
        Detail={Detail}
        detailProps={detailProps}
        expandedKeys={expandedKeys}
        sort={table.sort}
        onSort={table.setSort}
        hiddenColumns={table.hiddenColumns}
        widths={table.widths}
        onResize={table.setColumnWidth}
        ctx={ctx}
        emptyText={t(EMPTY_KEYS[state] || emptyKey)}
      />
    </div>
  );
};

ManageTable.propTypes = {
  name: PropTypes.string.isRequired,
  columns: PropTypes.array.isRequired,
  table: PropTypes.shape({
    rows: PropTypes.array.isRequired,
    sort: sortShape.isRequired,
    setSort: PropTypes.func.isRequired,
    hiddenColumns: PropTypes.instanceOf(Set).isRequired,
    widths: PropTypes.objectOf(PropTypes.number).isRequired,
    setColumnWidth: PropTypes.func.isRequired,
    rowRef: PropTypes.func,
  }).isRequired,
  rowKey: PropTypes.func.isRequired,
  rowProp: PropTypes.string,
  RowActions: PropTypes.elementType,
  actionsProps: PropTypes.object,
  Detail: PropTypes.elementType,
  detailProps: PropTypes.object,
  expandedKeys: PropTypes.instanceOf(Set),
  ctx: PropTypes.object.isRequired,
  emptyKey: PropTypes.string.isRequired,
  reading: PropTypes.shape({
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
};

/**
 * A list inside a dialog of a page of a host: the `SubTable` over rows
 * the page's search does not reach, sorted by the dialog alone, every
 * column shown.
 */
export const DialogTable = ({
  name,
  columns,
  rows,
  rowKey,
  RowActions = null,
  actionsProps = NO_PROPS,
  ctx,
  emptyText,
}) => {
  const [sort, setSort] = useState([]);
  return (
    <div data-table={name}>
      <SubTable
        columns={columns}
        rows={sortItems(rows, sort, columns, ctx)}
        rowKey={rowKey}
        RowActions={RowActions}
        actionsProps={actionsProps}
        sort={sort}
        onSort={(column, options) => setSort(current => nextSort(current, column, options))}
        hiddenColumns={NO_HIDDEN}
        ctx={ctx}
        emptyText={emptyText}
      />
    </div>
  );
};

DialogTable.propTypes = {
  name: PropTypes.string.isRequired,
  columns: PropTypes.array.isRequired,
  rows: PropTypes.array.isRequired,
  rowKey: PropTypes.func.isRequired,
  RowActions: PropTypes.elementType,
  actionsProps: PropTypes.object,
  ctx: PropTypes.object.isRequired,
  emptyText: PropTypes.node.isRequired,
};

export default ManageTable;
