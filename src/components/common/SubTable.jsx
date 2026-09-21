import PropTypes from 'prop-types';
import { useRef, useState } from 'react';
import { Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaRegStar, FaStar } from 'react-icons/fa6';

import { useCssVar } from '../../hooks/useCssVar';
import { sortShape } from '../../utils/itemShape';

import { KIND_NAMES, isFlexKind, kindClasses, kindWidth } from './columnKinds';
import EmptyState from './EmptyState';
import GroupHeading, { groupShape } from './GroupHeading';
import { RowCheckbox, SelectAllCheckbox, selectionShape } from './SelectCheckbox';
import SortHeader from './SortHeader';

export { selectionShape };

const MIN_WIDTH = 48;
const KEY_STEP = 16;
const NO_WIDTHS = {};
const NO_COLLAPSED = {};

const CHAR_REM = 0.5;
const FLOOR_REM = 8;
const CEIL_REM = 32;
const SIDE_WIDTH = 'var(--col-w-side)';
const ACTIONS_WIDTH = 'var(--col-w-actions)';

export const watchesShape = PropTypes.shape({
  ids: PropTypes.instanceOf(Set).isRequired,
  toggle: PropTypes.func,
});

/**
 * Builds a column `when` that is true when any row satisfies `pick`.
 *
 * @param {Function} pick Reads the value a column needs from one row
 * @returns {Function} `when(rows, ctx)` for a SubTable column
 */
export const hasAny = pick => rows => rows.some(row => Boolean(pick(row)));

/**
 * The columns a table draws for the given rows and `ctx`: every column
 * whose `when` is absent or true, in order; the set the Columns pill
 * group offers as well, so a column the table is not drawing is not
 * offered.
 *
 * @param {Array} columns - The table's columns
 * @param {Array} rows - The rows the table draws
 * @param {Object} ctx - The table's context
 * @returns {Array} The drawn columns
 */
export const drawnColumns = (columns, rows, ctx) =>
  columns.filter(column => !column.when || column.when(rows, ctx));

const hasGroups = groups => Boolean(groups && groups.length > 0);

const columnClass = column => `col-${column.key} ${kindClasses(column.kind)}`;

const cellClass = column =>
  column.className ? `${columnClass(column)} ${column.className}` : columnClass(column);

const cellText = (column, row, ctx) => String(column.value(row, ctx) ?? '');

const measureRem = (column, rows, ctx) => {
  const longest = rows.reduce((max, row) => Math.max(max, cellText(column, row, ctx).length), 0);
  return Math.min(CEIL_REM, Math.max(FLOOR_REM, longest * CHAR_REM));
};

const takenWidths = ({ drawn, widths, selection, watches, actions }) => [
  ...(selection ? [SIDE_WIDTH] : []),
  ...(watches ? [SIDE_WIDTH] : []),
  ...(actions ? [ACTIONS_WIDTH] : []),
  ...drawn
    .filter(column => widths[column.key] || !isFlexKind(column.kind))
    .map(column =>
      widths[column.key] ? `${widths[column.key]}px` : `var(--col-w-${kindWidth(column.kind)})`
    ),
];

/**
 * The width of every flex column the viewer has not resized, as a CSS
 * width: the room the fixed columns, the leading select and watch cells,
 * the Actions column and every stored width leave is split among them by
 * the longest text their `value` answers over the rows drawn, each
 * measured in rem and clamped between a floor, so a name never starves,
 * and a ceiling, so a checksum or a path gets what it needs and no more;
 * the first of them takes no width and so absorbs the room the others
 * leave, the way a fixed layout hands its leftover to an unsized column.
 *
 * @param {Object} shape - The `drawn` columns, the `rows`, the stored `widths`, `selection`, `watches`, `actions` and `ctx`
 * @returns {Object<string, string>} The CSS width per flex column key
 */
const flexWidths = ({ drawn, rows, widths, selection, watches, actions, ctx }) => {
  const sharers = drawn.filter(column => isFlexKind(column.kind) && !widths[column.key]);
  if (sharers.length < 2) {
    return NO_WIDTHS;
  }
  const measures = sharers.map(column => measureRem(column, rows, ctx));
  const total = measures.reduce((sum, rem) => sum + rem, 0);
  const taken = takenWidths({ drawn, widths, selection, watches, actions });
  const room = taken.length > 0 ? `(100% - ${taken.join(' - ')})` : '100%';
  return Object.fromEntries(
    sharers
      .slice(1)
      .map((column, index) => [column.key, `calc(${room} * ${measures[index + 1] / total})`])
  );
};

const assertFlexFirst = drawn => {
  if (import.meta.env.DEV && drawn.length > 0 && !isFlexKind(drawn[0].kind)) {
    console.error(`SubTable: the first drawn column, ${drawn[0].key}, is not a flex kind`);
  }
};

/**
 * The shape one render of the table takes from its props: the columns
 * drawn (not hidden, and their `when` true for the rows and `ctx`), the
 * CSS width of every column that takes one (a stored resize in pixels,
 * else a flex column's share), whether an Actions column draws, and the
 * count of cells a full-width row spans.
 *
 * @param {Object} props - The table's `columns`, `rows`, `hiddenColumns`, `widths`, `selection`, `watches`, `LeadActions`, `RowActions` and `ctx`
 * @returns {{ drawn: Array, colWidths: Object, actions: boolean, columnCount: number }} The shape
 */
const shapeOf = ({
  columns,
  rows,
  hiddenColumns,
  widths,
  selection,
  watches,
  LeadActions,
  RowActions,
  ctx,
}) => {
  const drawn = drawnColumns(
    columns.filter(column => !hiddenColumns.has(column.key)),
    rows,
    ctx
  );
  assertFlexFirst(drawn);
  const actions = Boolean(LeadActions || RowActions);
  const flex = flexWidths({ drawn, rows, widths, selection, watches, actions, ctx });
  const colWidths = Object.fromEntries(
    drawn
      .filter(column => widths[column.key] || flex[column.key])
      .map(column => [
        column.key,
        widths[column.key] ? `${widths[column.key]}px` : flex[column.key],
      ])
  );
  const columnCount = drawn.length + [selection, watches, actions].filter(Boolean).length;
  return { drawn, colWidths, actions, columnCount };
};

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

const SizedCol = ({ column, width }) => {
  const col = useRef(null);
  useCssVar(col, '--col-width', width);
  const base = columnClass(column);
  return <col ref={col} className={width ? `${base} col-sized` : base} />;
};

SizedCol.propTypes = {
  column: PropTypes.shape({
    key: PropTypes.string.isRequired,
    kind: PropTypes.oneOf(KIND_NAMES).isRequired,
  }).isRequired,
  width: PropTypes.string,
};

const ColumnGroup = ({ drawn, selection, watches, actions, colWidths }) => (
  <colgroup>
    {selection ? <col className="col-select" /> : null}
    {watches ? <col className="col-watch" /> : null}
    {drawn.map(column => (
      <SizedCol key={column.key} column={column} width={colWidths[column.key] || null} />
    ))}
    {actions ? <col className="col-actions" /> : null}
  </colgroup>
);

ColumnGroup.propTypes = {
  drawn: PropTypes.array.isRequired,
  selection: selectionShape,
  watches: watchesShape,
  actions: PropTypes.bool.isRequired,
  colWidths: PropTypes.objectOf(PropTypes.string).isRequired,
};

const HeaderCell = ({ column, sort, onSort, onResize }) => {
  const { t } = useTranslation();
  const cell = useRef(null);
  return (
    <th ref={cell} className={columnClass(column)}>
      <SortHeader column={column.key} sort={sort} onSort={onSort}>
        {t(column.labelKey)}
      </SortHeader>
      {onResize ? <ResizeHandle columnKey={column.key} cell={cell} onResize={onResize} /> : null}
    </th>
  );
};

HeaderCell.propTypes = {
  column: PropTypes.shape({
    key: PropTypes.string.isRequired,
    kind: PropTypes.oneOf(KIND_NAMES).isRequired,
    labelKey: PropTypes.string.isRequired,
  }).isRequired,
  sort: sortShape.isRequired,
  onSort: PropTypes.func.isRequired,
  onResize: PropTypes.func,
};

const HeaderRow = ({ drawn, selection, watches, actions, sort, onSort, onResize }) => {
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
      {actions ? <th className="col-actions">{t('pages.table.actions')}</th> : null}
    </tr>
  );
};

HeaderRow.propTypes = {
  drawn: PropTypes.array.isRequired,
  selection: selectionShape,
  watches: watchesShape,
  actions: PropTypes.bool.isRequired,
  sort: sortShape.isRequired,
  onSort: PropTypes.func.isRequired,
  onResize: PropTypes.func,
};

const ActionsCell = ({ LeadActions, RowActions, actionsProps, own, ctx }) => (
  <td className="col-actions">
    <span className="d-inline-flex align-items-center flex-wrap gap-1">
      {LeadActions ? <LeadActions {...own} ctx={ctx} /> : null}
      {RowActions ? <RowActions {...actionsProps} {...own} /> : null}
    </span>
  </td>
);

ActionsCell.propTypes = {
  LeadActions: PropTypes.elementType,
  RowActions: PropTypes.elementType,
  actionsProps: PropTypes.object.isRequired,
  own: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
};

const cellContent = (column, row, ctx) =>
  column.render ? column.render(row, ctx) : column.value(row, ctx);

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
  LeadActions,
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
            <div className="cell">{cellContent(column, row, ctx)}</div>
          </td>
        ))}
        {LeadActions || RowActions ? (
          <ActionsCell
            LeadActions={LeadActions}
            RowActions={RowActions}
            actionsProps={actionsProps}
            own={own}
            ctx={ctx}
          />
        ) : null}
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
  LeadActions: PropTypes.elementType,
  RowActions: PropTypes.elementType,
  actionsProps: PropTypes.object.isRequired,
  Detail: PropTypes.elementType,
  detailProps: PropTypes.object.isRequired,
  expandedKeys: PropTypes.instanceOf(Set),
  columnCount: PropTypes.number.isRequired,
  ctx: PropTypes.object.isRequired,
};

const GroupRows = ({ group, emptyText, rowProps }) => {
  const { rowKey, columnCount } = rowProps;
  if (group.items.length === 0) {
    return (
      <tr className="empty-row">
        <td colSpan={columnCount}>
          <EmptyState title={emptyText} className="empty-state-sm" />
        </td>
      </tr>
    );
  }
  return group.items.map(row => <BodyRow key={rowKey(row)} row={row} {...rowProps} />);
};

GroupRows.propTypes = {
  group: groupShape.isRequired,
  emptyText: PropTypes.node.isRequired,
  rowProps: PropTypes.object.isRequired,
};

const TableBody = ({ rows, groups, collapsed, onToggleGroup, countKey, emptyText, rowProps }) => {
  const { t } = useTranslation();
  const { rowKey, columnCount, ctx } = rowProps;
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
      {collapsed[group.key] ? null : (
        <GroupRows group={group} emptyText={emptyText} rowProps={rowProps} />
      )}
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
 * true for the rows and `ctx` (so a column can read the viewer and the
 * host from `ctx` as well as the rows). A column is `{ key, kind,
 * labelKey, value, render? }`: `value(row, ctx)` answers the one thing
 * the cell shows, a string, a number, the instant of a date or relative
 * kind, the word of a badge or word kind, the joined labels of a badges
 * kind, and is what the cell draws unless `render(row, ctx)` is given, a
 * link or a composite that shows exactly what `value` names; every
 * header sorts by `value` through `sortItems`, ascending, descending,
 * then off, a Shift-click adding to the stack. Each cell is one
 * `td.col-<key>`, its content in one `.cell` block the stylesheet styles
 * by the column's kind, every `col`, `th` and `td` also carrying the
 * width and kind classes of that `kind` (`columnKinds`, `col-w-narrow`,
 * `col-w-medium` or `col-w-flex` and `col-k-<kind>`) so the width and
 * the look come from the kind alone, never from a column key, and a
 * column without a `kind` is a defect. The first drawn column of every
 * table is a flex kind, asserted in development; the flex columns split
 * the room the fixed ones leave by the longest `value` text each shows
 * over the rows drawn, measured once per render and clamped between a
 * floor and a ceiling in rem, the first of them unsized so the fixed
 * layout hands it the leftover, a stored resize winning over the split.
 * A leading select column draws when `selection`
 * is given (a real checkbox header, checked, unchecked or indeterminate,
 * the select-all for the page, and one row checkbox per cell), the watch
 * column after it when `watches` is given (a star header sorting by
 * `watch` and one star per row while `watches.toggle` is set, the header
 * star alone and blank cells otherwise, so a listing keeps its shape
 * signed out), an actions column when `LeadActions` or `RowActions` is
 * given, `LeadActions` the actions every viewer of the row gets (a
 * download), rendered with `ctx` plus the row under `rowProp` and drawn
 * first, `RowActions` the host's own, rendered with
 * `actionsProps` plus the row under `rowProp`, the class `rowClass`
 * answers on each row, one full-width detail row under every row whose key
 * is in `expandedKeys` (rendering `Detail` with `detailProps` plus the row
 * under `rowProp`), one `tbody` per group with a `GroupHeading` row when
 * `groups` is given (`collapsed[group.key]` folding it through
 * `onToggleGroup`, the count from `countKey`), a group with no items
 * keeping its heading over one full-width compact `EmptyState` row titled
 * `emptyText`, and, when there are no rows and no groups, the `EmptyState`
 * placard titled `emptyText` with `emptyBody` under it drawn inside the
 * wrap in place of the whole table, no column group and no header, so an
 * empty collection reads as a placard and not as a headed blank. `rowId`, where given, is the DOM
 * id each row carries, so a page can bring one row into view; `rowRef`,
 * where given, is `useArrival`'s `ref`, called with each row's key, and
 * every row then takes focus (`tabIndex` -1) so the arrival rule's scroll
 * and focus both land on it. Every data
 * column's header carries a resize handle on its right edge while
 * `onResize` is given, a button the way the sortable list's grip is: a
 * drag calls `onResize(key, pixels)` and shows the width, Left and Right
 * nudge it by 16px, a double-click, Enter or Home
 * call `onResize(key, null)` to reset; `widths` (column key to pixels)
 * sets each column's width over the kind's, a hidden column keeping
 * its entry. The widths live on a `colgroup`, one `col` per cell carrying
 * the cell's `col-<key>`, width and kind classes and, when sized, the
 * width as `--col-width`, so the fixed leading cells sit at one x on
 * every table and a drag takes room from the flex columns alone.
 */
const SubTable = ({ emptyBody = null, ...table }) => {
  if (table.rows.length === 0 && !hasGroups(table.groups)) {
    return (
      <div className="items-table-wrap">
        <EmptyState title={table.emptyText} body={emptyBody} />
      </div>
    );
  }
  return <FullTable {...table} />;
};

const FullTable = ({
  columns,
  rows,
  rowKey,
  rowId = null,
  rowRef = null,
  LeadActions = null,
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
  const { drawn, colWidths, actions, columnCount } = shapeOf({
    columns,
    rows,
    hiddenColumns,
    widths,
    selection,
    watches,
    LeadActions,
    RowActions,
    ctx,
  });
  const rowProps = {
    drawn,
    rowKey,
    rowId,
    rowRef,
    rowProp,
    rowClass,
    selection,
    watches,
    LeadActions,
    RowActions,
    actionsProps,
    Detail,
    detailProps,
    expandedKeys,
    columnCount,
    ctx,
  };
  return (
    <div className="items-table-wrap">
      <Table striped className="table items-table">
        <ColumnGroup
          drawn={drawn}
          selection={selection}
          watches={watches}
          actions={actions}
          colWidths={colWidths}
        />
        <thead>
          <HeaderRow
            drawn={drawn}
            selection={selection}
            watches={watches}
            actions={actions}
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
    </div>
  );
};

const tableShape = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      kind: PropTypes.oneOf(KIND_NAMES).isRequired,
      labelKey: PropTypes.string.isRequired,
      value: PropTypes.func.isRequired,
      render: PropTypes.func,
      defaultHidden: PropTypes.bool,
      when: PropTypes.func,
      className: PropTypes.string,
    })
  ).isRequired,
  rows: PropTypes.array.isRequired,
  rowKey: PropTypes.func.isRequired,
  rowId: PropTypes.func,
  rowRef: PropTypes.func,
  LeadActions: PropTypes.elementType,
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

FullTable.propTypes = tableShape;

SubTable.propTypes = { ...tableShape, emptyBody: PropTypes.node };

export default SubTable;
