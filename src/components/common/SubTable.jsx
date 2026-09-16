import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import { Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaRegStar, FaStar } from 'react-icons/fa6';

import { useCssVar } from '../../hooks/useCssVar';
import { sortShape } from '../../utils/itemShape';

import GroupHeading, { groupShape } from './GroupHeading';
import { RowCheckbox, SelectAllCheckbox, selectionShape } from './SelectCheckbox';
import SortHeader from './SortHeader';

export { selectionShape };

const MIN_WIDTH = 48;
const KEY_STEP = 16;
const NO_WIDTHS = {};
const NO_COLLAPSED = {};

export const watchesShape = PropTypes.shape({
  ids: PropTypes.instanceOf(Set).isRequired,
  toggle: PropTypes.func,
});

/**
 * Builds a column `when` that is true when any row satisfies `pick`.
 *
 * @param {Function} pick Reads the value a column needs from one row
 * @returns {Function} `when(rows)` for a SubTable column
 */
export const hasAny = pick => rows => rows.some(row => Boolean(pick(row)));

const cellClass = column =>
  column.className ? `col-${column.key} ${column.className}` : `col-${column.key}`;

const WatchStar = ({ watched, onToggle }) => {
  const { t } = useTranslation();
  const label = watched ? t('pages.watch.unwatch') : t('pages.watch.watch');
  return (
    <button
      type="button"
      className="btn btn-link btn-sm p-0 text-warning"
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-pressed={watched}
    >
      {watched ? <FaStar /> : <FaRegStar />}
    </button>
  );
};

WatchStar.propTypes = {
  watched: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

const WatchHeader = ({ watches, sort, onSort }) => {
  const { t } = useTranslation();
  const star = <FaRegStar aria-label={t('pages.watch.filterWatched')} />;
  return (
    <th className="col-watch text-center" title={t('pages.watch.filterWatched')}>
      {watches.toggle ? (
        <SortHeader column="watch" sort={sort} onSort={onSort}>
          {star}
        </SortHeader>
      ) : (
        star
      )}
    </th>
  );
};

WatchHeader.propTypes = {
  watches: watchesShape.isRequired,
  sort: sortShape.isRequired,
  onSort: PropTypes.func.isRequired,
};

const ResizeHandle = ({ columnKey, cell, onResize }) => {
  const { t } = useTranslation();
  const [tip, setTip] = useState(null);
  const start = useRef({ x: 0, width: 0 });
  const active = useRef(false);

  const measured = () => cell.current.getBoundingClientRect().width;
  const clamp = pixels => Math.max(MIN_WIDTH, Math.round(pixels));

  const onPointerDown = event => {
    event.preventDefault();
    start.current = { x: event.clientX, width: measured() };
    active.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setTip(Math.round(start.current.width));
  };

  const onPointerMove = event => {
    if (!active.current) {
      return;
    }
    const next = clamp(start.current.width + event.clientX - start.current.x);
    setTip(next);
    onResize(columnKey, next);
  };

  const onPointerUp = event => {
    if (!active.current) {
      return;
    }
    active.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setTip(null);
  };

  const onKeyDown = event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const delta = event.key === 'ArrowLeft' ? -KEY_STEP : KEY_STEP;
      onResize(columnKey, clamp(measured() + delta));
    }
    if (event.key === 'Enter' || event.key === 'Home') {
      event.preventDefault();
      onResize(columnKey, null);
    }
  };

  return (
    <button
      type="button"
      className={tip === null ? 'col-resize' : 'col-resize dragging'}
      aria-label={t('pages.table.resize')}
      title={t('pages.table.resizeHint')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={() => onResize(columnKey, null)}
      onKeyDown={onKeyDown}
    >
      {tip === null ? null : <span className="col-resize-tip">{tip}px</span>}
    </button>
  );
};

ResizeHandle.propTypes = {
  columnKey: PropTypes.string.isRequired,
  cell: PropTypes.shape({ current: PropTypes.object }).isRequired,
  onResize: PropTypes.func.isRequired,
};

const SizedCol = ({ columnKey, width }) => {
  const col = useRef(null);
  useCssVar(col, '--col-width', width ? `${width}px` : null);
  return <col ref={col} className={width ? `col-${columnKey} col-sized` : `col-${columnKey}`} />;
};

SizedCol.propTypes = {
  columnKey: PropTypes.string.isRequired,
  width: PropTypes.number,
};

const ColumnGroup = ({ drawn, selection, watches, QuickActions, RowActions, widths }) => (
  <colgroup>
    {selection ? <col className="col-select" /> : null}
    {watches ? <col className="col-watch" /> : null}
    {drawn.map(column => (
      <SizedCol key={column.key} columnKey={column.key} width={widths[column.key] || null} />
    ))}
    {QuickActions ? <col className="col-quick" /> : null}
    {RowActions ? <col className="col-actions" /> : null}
    <col className="col-spacer" />
  </colgroup>
);

ColumnGroup.propTypes = {
  drawn: PropTypes.array.isRequired,
  selection: selectionShape,
  watches: watchesShape,
  QuickActions: PropTypes.elementType,
  RowActions: PropTypes.elementType,
  widths: PropTypes.objectOf(PropTypes.number).isRequired,
};

const HeaderCell = ({ column, sort, onSort, onResize }) => {
  const { t } = useTranslation();
  const cell = useRef(null);
  const label = column.sortValue ? (
    <SortHeader column={column.key} sort={sort} onSort={onSort}>
      {t(column.labelKey)}
    </SortHeader>
  ) : (
    t(column.labelKey)
  );
  return (
    <th ref={cell} className={`col-${column.key}`}>
      {label}
      {onResize ? <ResizeHandle columnKey={column.key} cell={cell} onResize={onResize} /> : null}
    </th>
  );
};

HeaderCell.propTypes = {
  column: PropTypes.shape({
    key: PropTypes.string.isRequired,
    labelKey: PropTypes.string.isRequired,
    sortValue: PropTypes.func,
  }).isRequired,
  sort: sortShape.isRequired,
  onSort: PropTypes.func.isRequired,
  onResize: PropTypes.func,
};

const HeaderRow = ({
  drawn,
  selection,
  watches,
  QuickActions,
  RowActions,
  sort,
  onSort,
  onResize,
}) => {
  const { t } = useTranslation();
  return (
    <tr>
      {selection ? (
        <th className="col-select">
          <SelectAllCheckbox selection={selection} />
        </th>
      ) : null}
      {watches ? <WatchHeader watches={watches} sort={sort} onSort={onSort} /> : null}
      {drawn.map(column => (
        <HeaderCell
          key={column.key}
          column={column}
          sort={sort}
          onSort={onSort}
          onResize={onResize}
        />
      ))}
      {QuickActions ? <th className="col-quick" aria-label={t('pages.table.actions')} /> : null}
      {RowActions ? <th className="col-actions">{t('pages.table.actions')}</th> : null}
      <th className="col-spacer" aria-hidden="true" />
    </tr>
  );
};

HeaderRow.propTypes = {
  drawn: PropTypes.array.isRequired,
  selection: selectionShape,
  watches: watchesShape,
  QuickActions: PropTypes.elementType,
  RowActions: PropTypes.elementType,
  sort: sortShape.isRequired,
  onSort: PropTypes.func.isRequired,
  onResize: PropTypes.func,
};

const BodyRow = ({
  row,
  drawn,
  rowKey,
  rowId,
  rowRef,
  rowProp,
  rowClass,
  selection,
  watches,
  QuickActions,
  RowActions,
  actionsProps,
  Detail,
  detailProps,
  expandedKeys,
  columnCount,
  ctx,
}) => {
  const own = { [rowProp]: row };
  const expanded = Boolean(Detail && expandedKeys && expandedKeys.has(rowKey(row)));
  return (
    <>
      <tr
        ref={rowRef ? rowRef(rowKey(row)) : undefined}
        tabIndex={rowRef ? -1 : undefined}
        id={rowId ? rowId(row) : undefined}
        className={rowClass ? rowClass(row) : undefined}
      >
        {selection ? (
          <td className="col-select">
            <RowCheckbox selection={selection} row={row} />
          </td>
        ) : null}
        {watches ? (
          <td className="col-watch text-center align-middle">
            {watches.toggle ? (
              <WatchStar
                watched={watches.ids.has(rowKey(row))}
                onToggle={() => watches.toggle(row)}
              />
            ) : null}
          </td>
        ) : null}
        {drawn.map(column => (
          <td key={column.key} className={cellClass(column)}>
            {column.render(row, ctx)}
          </td>
        ))}
        {QuickActions ? (
          <td className="col-quick text-center align-middle">
            <QuickActions {...own} ctx={ctx} />
          </td>
        ) : null}
        {RowActions ? (
          <td className="col-actions">
            <RowActions {...actionsProps} {...own} />
          </td>
        ) : null}
        <td className="col-spacer" />
      </tr>
      {expanded ? (
        <tr className="detail-row">
          <td colSpan={columnCount}>
            <Detail {...detailProps} {...own} />
          </td>
        </tr>
      ) : null}
    </>
  );
};

BodyRow.propTypes = {
  row: PropTypes.object.isRequired,
  drawn: PropTypes.array.isRequired,
  rowKey: PropTypes.func.isRequired,
  rowId: PropTypes.func,
  rowRef: PropTypes.func,
  rowProp: PropTypes.string.isRequired,
  rowClass: PropTypes.func,
  selection: selectionShape,
  watches: watchesShape,
  QuickActions: PropTypes.elementType,
  RowActions: PropTypes.elementType,
  actionsProps: PropTypes.object.isRequired,
  Detail: PropTypes.elementType,
  detailProps: PropTypes.object.isRequired,
  expandedKeys: PropTypes.instanceOf(Set),
  columnCount: PropTypes.number.isRequired,
  ctx: PropTypes.object.isRequired,
};

const TableBody = ({ rows, groups, collapsed, onToggleGroup, countKey, emptyText, rowProps }) => {
  const { t } = useTranslation();
  const { rowKey, columnCount, ctx } = rowProps;
  if (rows.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={columnCount} className="text-center">
            {emptyText}
          </td>
        </tr>
      </tbody>
    );
  }
  if (!groups) {
    return (
      <tbody>
        {rows.map(row => (
          <BodyRow key={rowKey(row)} row={row} {...rowProps} />
        ))}
      </tbody>
    );
  }
  return groups.map(group => (
    <tbody key={group.key}>
      <tr className="table-group-row">
        <td colSpan={columnCount}>
          <GroupHeading
            group={group}
            collapsed={Boolean(collapsed[group.key])}
            onToggle={() => onToggleGroup(group.key)}
            countLabel={t(countKey, { count: group.items.length })}
            orgMark={ctx.orgMark}
          />
        </td>
      </tr>
      {collapsed[group.key]
        ? null
        : group.items.map(row => <BodyRow key={rowKey(row)} row={row} {...rowProps} />)}
    </tbody>
  ));
};

TableBody.propTypes = {
  rows: PropTypes.array.isRequired,
  groups: PropTypes.arrayOf(groupShape),
  collapsed: PropTypes.object.isRequired,
  onToggleGroup: PropTypes.func,
  countKey: PropTypes.string.isRequired,
  emptyText: PropTypes.node.isRequired,
  rowProps: PropTypes.object.isRequired,
};

/**
 * The one table of the estate: the collection listings, the item, version
 * and provider detail pages, the admin lists, the fleet, the search page
 * and the organization console's lists. Draws the given columns in order,
 * each only when it is not in `hiddenColumns` and its `when` is absent or
 * true for the rows, a sort header for each column carrying a `sortValue`,
 * one `td.col-<key>` per column, a leading select column when `selection`
 * is given (a real checkbox header, checked, unchecked or indeterminate,
 * the select-all for the page, and one row checkbox per cell), the watch
 * column after it when `watches` is given (a star header sorting by
 * `watch` and one star per row while `watches.toggle` is set, the header
 * star alone and blank cells otherwise, so a listing keeps its shape
 * signed out), a quick-actions cell before the actions column when
 * `QuickActions` is given (rendered with `ctx` plus the row under
 * `rowProp`), an actions column when `RowActions` is given (rendered with
 * `actionsProps` plus the row under `rowProp`), the class `rowClass`
 * answers on each row, one full-width detail row under every row whose key
 * is in `expandedKeys` (rendering `Detail` with `detailProps` plus the row
 * under `rowProp`), one `tbody` per group with a `GroupHeading` row when
 * `groups` is given (`collapsed[group.key]` folding it through
 * `onToggleGroup`, the count from `countKey`), and one full-width
 * `emptyText` row when there are no rows. `rowId`, where given, is the DOM
 * id each row carries, so a page can bring one row into view; `rowRef`,
 * where given, is `useArrival`'s `ref`, called with each row's key, and
 * every row then takes focus (`tabIndex` -1) so the arrival rule's scroll
 * and focus both land on it. Every data
 * column's header carries a resize handle on its right edge while
 * `onResize` is given, a button the way the sortable list's grip is: a
 * drag calls `onResize(key, pixels)` and shows the width, Left and Right
 * nudge it by 16px, a double-click, Enter or Home
 * call `onResize(key, null)` to reset; `widths` (column key to pixels)
 * sets each column's width over the stylesheet's, a hidden column keeping
 * its entry. The widths live on a `colgroup`, one `col` per cell carrying
 * the cell's `col-<key>` class and, when stored, the width, and a trailing
 * unsized `col` with an empty header and body cell is the spacer that takes
 * whatever width the fixed columns leave, so the shared columns sit at one
 * x on every table whatever is hidden and a drag moves the spacer alone.
 */
const SubTable = ({
  columns,
  rows,
  rowKey,
  rowId = null,
  rowRef = null,
  RowActions = null,
  actionsProps = {},
  QuickActions = null,
  rowProp = 'row',
  rowClass = null,
  Detail = null,
  detailProps = {},
  expandedKeys = null,
  sort,
  onSort,
  hiddenColumns,
  widths = NO_WIDTHS,
  onResize = null,
  ctx,
  emptyText,
  selection = null,
  watches = null,
  groups = null,
  collapsed = NO_COLLAPSED,
  onToggleGroup = null,
  countKey = '',
}) => {
  const drawn = columns.filter(
    column => !hiddenColumns.has(column.key) && (!column.when || column.when(rows))
  );
  const columnCount =
    drawn.length + [selection, watches, QuickActions, RowActions].filter(Boolean).length + 1;
  const rowProps = {
    drawn,
    rowKey,
    rowId,
    rowRef,
    rowProp,
    rowClass,
    selection,
    watches,
    QuickActions,
    RowActions,
    actionsProps,
    Detail,
    detailProps,
    expandedKeys,
    columnCount,
    ctx,
  };
  return (
    <Table striped className="table items-table">
      <ColumnGroup
        drawn={drawn}
        selection={selection}
        watches={watches}
        QuickActions={QuickActions}
        RowActions={RowActions}
        widths={widths}
      />
      <thead>
        <HeaderRow
          drawn={drawn}
          selection={selection}
          watches={watches}
          QuickActions={QuickActions}
          RowActions={RowActions}
          sort={sort}
          onSort={onSort}
          onResize={onResize}
        />
      </thead>
      <TableBody
        rows={rows}
        groups={groups}
        collapsed={collapsed}
        onToggleGroup={onToggleGroup}
        countKey={countKey}
        emptyText={emptyText}
        rowProps={rowProps}
      />
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
  rowRef: PropTypes.func,
  RowActions: PropTypes.elementType,
  actionsProps: PropTypes.object,
  QuickActions: PropTypes.elementType,
  rowProp: PropTypes.string,
  rowClass: PropTypes.func,
  Detail: PropTypes.elementType,
  detailProps: PropTypes.object,
  expandedKeys: PropTypes.instanceOf(Set),
  sort: sortShape.isRequired,
  onSort: PropTypes.func.isRequired,
  hiddenColumns: PropTypes.instanceOf(Set).isRequired,
  widths: PropTypes.objectOf(PropTypes.number),
  onResize: PropTypes.func,
  ctx: PropTypes.object.isRequired,
  emptyText: PropTypes.node.isRequired,
  selection: selectionShape,
  watches: watchesShape,
  groups: PropTypes.arrayOf(groupShape),
  collapsed: PropTypes.object,
  onToggleGroup: PropTypes.func,
  countKey: PropTypes.string,
};

export default SubTable;
