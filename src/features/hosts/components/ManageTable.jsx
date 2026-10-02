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
 * One table of the Manage page, the one `SubTable` over the rows the
 * page's one search binding left, in the table's own sort, hidden
 * columns and widths, with the row actions the section hands it. While
 * the read has not answered the table draws the loading line, the read
 * error when it failed, the no matches line while a query or a filter
 * left no row, and the table's own empty line otherwise; `data-table`
 * names the table and `data-state` which of them stands.
 */
const ManageTable = ({
  name,
  columns,
  table,
  rowKey,
  rowProp = 'row',
  RowActions = null,
  actionsProps = NO_PROPS,
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
        rowProp={rowProp}
        RowActions={RowActions}
        actionsProps={actionsProps}
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
  }).isRequired,
  rowKey: PropTypes.func.isRequired,
  rowProp: PropTypes.string,
  RowActions: PropTypes.elementType,
  actionsProps: PropTypes.object,
  ctx: PropTypes.object.isRequired,
  emptyKey: PropTypes.string.isRequired,
  reading: PropTypes.shape({
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
};

/**
 * A list inside a dialog of the Manage page, the properties of a
 * service, the open files and the limits of a process: the one
 * `SubTable` over rows the page's binding does not reach, its sort the
 * dialog's own, every column shown and no width kept, with the row
 * actions the dialog hands it.
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
