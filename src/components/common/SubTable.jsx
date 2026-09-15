import PropTypes from 'prop-types';
import { Fragment } from 'react';
import { Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import { sortShape } from '../../utils/itemShape';

import { RowCheckbox, SelectAllCheckbox, selectionShape } from './SelectCheckbox';
import SortHeader from './SortHeader';

export { selectionShape };

/**
 * Builds a column `when` that is true when any row satisfies `pick`.
 *
 * @param {Function} pick Reads the value a column needs from one row
 * @returns {Function} `when(rows)` for a SubTable column
 */
export const hasAny = pick => rows => rows.some(row => Boolean(pick(row)));

/**
 * The one table behind the item, version and provider detail pages and the
 * fleet page: draws the given columns in order, each only when it is not in
 * `hiddenColumns` and its `when` is absent or true for the rows, a sort
 * header for each column carrying a `sortValue`, one `td.col-<key>` per
 * column, an actions column when `RowActions` is given (rendered with
 * `actionsProps` plus the row under `rowProp`), the class `rowClass`
 * answers on each row, one full-width detail row under every row whose key
 * is in `expandedKeys` (rendering `Detail` with `detailProps` plus the row
 * under `rowProp`), a leading select column when `selection` is given (a
 * real checkbox header, checked, unchecked or indeterminate, the select-all
 * for the page, and one row checkbox per cell), and one full-width
 * `emptyText` row when there are no rows. `rowId`, where given, is the DOM
 * id each row carries, so a page can bring one row into view.
 */
const SubTable = ({
  columns,
  rows,
  rowKey,
  rowId = null,
  RowActions = null,
  actionsProps = {},
  rowProp = 'row',
  rowClass = null,
  Detail = null,
  detailProps = {},
  expandedKeys = null,
  sort,
  onSort,
  hiddenColumns,
  ctx,
  emptyText,
  selection = null,
}) => {
  const { t } = useTranslation();
  const drawn = columns.filter(
    column => !hiddenColumns.has(column.key) && (!column.when || column.when(rows))
  );
  const columnCount = drawn.length + (RowActions ? 1 : 0) + (selection ? 1 : 0);
  const cellClass = column =>
    column.className ? `col-${column.key} ${column.className}` : `col-${column.key}`;
  const expanded = row => Boolean(Detail && expandedKeys && expandedKeys.has(rowKey(row)));
  const headerOf = column => {
    if (column.sortValue) {
      return (
        <SortHeader column={column.key} sort={sort} onSort={onSort}>
          {t(column.labelKey)}
        </SortHeader>
      );
    }
    return t(column.labelKey);
  };
  return (
    <Table striped className="table items-table">
      <thead>
        <tr>
          {selection ? (
            <th className="col-select">
              <SelectAllCheckbox selection={selection} />
            </th>
          ) : null}
          {drawn.map(column => (
            <th key={column.key} className={`col-${column.key}`}>
              {headerOf(column)}
            </th>
          ))}
          {RowActions ? <th className="col-actions">{t('pages.table.actions')}</th> : null}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columnCount} className="text-center">
              {emptyText}
            </td>
          </tr>
        ) : (
          rows.map(row => (
            <Fragment key={rowKey(row)}>
              <tr
                id={rowId ? rowId(row) : undefined}
                className={rowClass ? rowClass(row) : undefined}
              >
                {selection ? (
                  <td className="col-select">
                    <RowCheckbox selection={selection} row={row} />
                  </td>
                ) : null}
                {drawn.map(column => (
                  <td key={column.key} className={cellClass(column)}>
                    {column.render(row, ctx)}
                  </td>
                ))}
                {RowActions ? (
                  <td className="col-actions">
                    <RowActions {...actionsProps} {...{ [rowProp]: row }} />
                  </td>
                ) : null}
              </tr>
              {expanded(row) ? (
                <tr className="detail-row">
                  <td colSpan={columnCount}>
                    <Detail {...detailProps} {...{ [rowProp]: row }} />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))
        )}
      </tbody>
    </Table>
  );
};

SubTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      labelKey: PropTypes.string.isRequired,
      render: PropTypes.func.isRequired,
      sortValue: PropTypes.func,
      defaultHidden: PropTypes.bool,
      when: PropTypes.func,
      className: PropTypes.string,
    })
  ).isRequired,
  rows: PropTypes.array.isRequired,
  rowKey: PropTypes.func.isRequired,
  rowId: PropTypes.func,
  RowActions: PropTypes.elementType,
  actionsProps: PropTypes.object,
  rowProp: PropTypes.string,
  rowClass: PropTypes.func,
  Detail: PropTypes.elementType,
  detailProps: PropTypes.object,
  expandedKeys: PropTypes.instanceOf(Set),
  sort: sortShape.isRequired,
  onSort: PropTypes.func.isRequired,
  hiddenColumns: PropTypes.instanceOf(Set).isRequired,
  ctx: PropTypes.object.isRequired,
  emptyText: PropTypes.node.isRequired,
  selection: selectionShape,
};

export default SubTable;
