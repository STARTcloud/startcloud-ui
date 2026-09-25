import PropTypes from 'prop-types';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaRegStar, FaStar } from 'react-icons/fa6';

import { useCssVar } from '../../hooks/useCssVar';
import { sortShape } from '../../utils/itemShape';

import { KIND_NAMES, kindClasses, kindPriority } from './columnKinds';
import EmptyState from './EmptyState';
import GroupHeading, { CollapseButton, groupShape } from './GroupHeading';
import RecordRows from './RecordRows';
import { RowCheckbox, SelectAllCheckbox, selectionShape } from './SelectCheckbox';
import SortHeader from './SortHeader';

export { selectionShape };

const MIN_WIDTH = 48;
const KEY_STEP = 16;
const NO_WIDTHS = {};
const NO_COLLAPSED = {};
const NO_FOLD = new Set();
const NO_NEEDS = {};
const PROSE_CAP_REM = 24;
const CHECKSUM_CAP_REM = 14;
const EMPTY_LAYOUT = { folded: NO_FOLD, ownerFolded: false, needs: NO_NEEDS };

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

const cellClass = (column, folded) => {
  const base = column.className
    ? `${columnClass(column)} ${column.className}`
    : columnClass(column);
  return folded ? `${base} folded` : base;
};

const columnPriority = column => column.priority ?? kindPriority(column.kind);

const rectWidth = element => element.getBoundingClientRect().width;

const remOf = () => parseFloat(getComputedStyle(document.documentElement).fontSize);

const cssVarRem = (element, name, rem) =>
  parseFloat(getComputedStyle(element).getPropertyValue(name)) * rem;

const paddingOf = element => {
  const style = getComputedStyle(element);
  return parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
};

const capOf = (column, rem) => {
  if (column.prose) {
    return PROSE_CAP_REM * rem;
  }
  if (column.kind === 'checksum') {
    return CHECKSUM_CAP_REM * rem;
  }
  return Infinity;
};

const measureColumn = (tableEl, className, cap) => {
  const header = tableEl.querySelector(`thead th.${className}`);
  if (!header) {
    return 0;
  }
  const cells = [header, ...tableEl.querySelectorAll(`tbody td.${className}`)];
  const widest = cells.reduce(
    (max, cell) =>
      cell.firstElementChild ? Math.max(max, rectWidth(cell.firstElementChild)) : max,
    0
  );
  return Math.min(Math.ceil(widest) + paddingOf(header), cap);
};

const measureAll = ({ tableEl, drawn, actions, rem }) => {
  tableEl.classList.add('measuring');
  const needs = {};
  drawn.forEach(column => {
    needs[column.key] = measureColumn(tableEl, `col-${column.key}`, capOf(column, rem));
  });
  const actionsNeed = actions ? measureColumn(tableEl, 'col-actions', Infinity) : 0;
  tableEl.classList.remove('measuring');
  return { needs, actionsNeed };
};

const foldOrder = drawn =>
  drawn
    .map((column, index) => ({ column, index, priority: columnPriority(column) }))
    .filter(entry => entry.priority > 1)
    .sort((a, b) => b.priority - a.priority || b.index - a.index)
    .map(entry => entry.column);

/**
 * One layout of a table against the room its wrap gives it: every drawn
 * column measured at the widest of its header button and its cells while
 * the table carries `measuring`, a prose column capped at 24rem and a
 * checksum at 14rem, the Actions column measured the same way; then the
 * columns folded, the highest priority number first and, among equals,
 * the rightmost first, until the sizes left (a stored resize over a
 * shared width over the need) fit the room, the organization in front of
 * the name folded before any column while the table draws one, and the
 * walk run again with the fold cell's width taken from the room once
 * anything folded.
 *
 * @param {Object} inputs - The `tableEl`, its `wrapEl`, the `drawn` columns, the stored `widths`, the `sharedWidths`, whether `actions` draw, `selection` and `watches`
 * @returns {{ folded: Set<string>, ownerFolded: boolean, needs: Object<string, number> }} The layout
 */
const layoutTable = ({
  tableEl,
  wrapEl,
  drawn,
  widths,
  sharedWidths,
  actions,
  selection,
  watches,
}) => {
  const rem = remOf();
  const side = cssVarRem(tableEl, '--col-w-side', rem);
  const foldWidth = cssVarRem(tableEl, '--col-w-fold', rem);
  const room = wrapEl.clientWidth - (selection ? side : 0) - (watches ? side : 0) - 1;
  const owner = Boolean(tableEl.querySelector('.name-org'));
  tableEl.classList.remove('fold-owner');
  let ownerFolded = false;
  let measured = measureAll({ tableEl, drawn, actions, rem });
  const sizeOf = column =>
    widths[column.key] || sharedWidths?.[column.key] || measured.needs[column.key];
  const totalOf = () =>
    drawn.reduce((sum, column) => sum + sizeOf(column), 0) + measured.actionsNeed;
  const order = foldOrder(drawn);
  const walk = available => {
    const folded = new Set();
    let total = totalOf();
    if (total > available && owner && !ownerFolded) {
      ownerFolded = true;
      tableEl.classList.add('fold-owner');
      measured = measureAll({ tableEl, drawn, actions, rem });
      total = totalOf();
    }
    order.forEach(column => {
      if (total > available) {
        folded.add(column.key);
        total -= sizeOf(column);
      }
    });
    return folded;
  };
  let folded = walk(room);
  if (folded.size > 0) {
    folded = walk(room - foldWidth);
  }
  return { folded, ownerFolded, needs: measured.needs };
};

const sameSet = (a, b) => a.size === b.size && [...a].every(key => b.has(key));

const sameNeeds = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const sameLayout = (a, b) =>
  a.ownerFolded === b.ownerFolded && sameSet(a.folded, b.folded) && sameNeeds(a.needs, b.needs);

/**
 * The table's own layout: lays the table out through `layoutTable`
 * before paint whenever the drawn keys, the rows, the stored or shared
 * widths or the language change, whenever the wrap resizes and once the
 * fonts are ready, hands `onNeeds` the needs each time a value changed,
 * and answers the folded column keys, whether the organization in front
 * of the name is folded and the needs.
 *
 * @param {Object} inputs - The `wrapRef` and `tableRef`, the `drawn` columns, `rows`, `widths`, `sharedWidths`, whether `actions` draw, `selection`, `watches`, the `language` and `onNeeds`
 * @returns {{ folded: Set<string>, ownerFolded: boolean, needs: Object<string, number> }} The layout
 */
const useFold = ({
  wrapRef,
  tableRef,
  drawn,
  rows,
  widths,
  sharedWidths,
  actions,
  selection,
  watches,
  language,
  onNeeds,
}) => {
  const inputs = useRef(null);
  const handed = useRef(NO_NEEDS);
  const [layout, setLayout] = useState(EMPTY_LAYOUT);
  const [tick, setTick] = useState(0);
  const keys = drawn.map(column => column.key).join(',');

  useLayoutEffect(() => {
    inputs.current = { drawn, widths, sharedWidths, actions, selection, watches, onNeeds };
  });

  useEffect(() => {
    const element = wrapRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(() => setTick(current => current + 1));
    observer.observe(element);
    return () => observer.disconnect();
  }, [wrapRef]);

  useEffect(() => {
    if (!document.fonts) {
      return undefined;
    }
    let mounted = true;
    document.fonts.ready.then(() => {
      if (mounted) {
        setTick(current => current + 1);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useLayoutEffect(() => {
    const tableEl = tableRef.current;
    const wrapEl = wrapRef.current;
    if (!tableEl || !wrapEl) {
      return;
    }
    const next = layoutTable({ tableEl, wrapEl, ...inputs.current });
    setLayout(current => (sameLayout(current, next) ? current : next));
    const { onNeeds: hand } = inputs.current;
    if (hand && !sameNeeds(handed.current, next.needs)) {
      handed.current = next.needs;
      hand(next.needs);
    }
  }, [wrapRef, tableRef, keys, rows, widths, sharedWidths, language, tick]);

  return layout;
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

const headerClass = (column, width, folded) => {
  const base = width ? `${columnClass(column)} col-sized` : columnClass(column);
  return folded ? `${base} folded` : base;
};

const HeaderCell = ({ column, width, folded, sort, onSort, onResize }) => {
  const { t } = useTranslation();
  const cell = useRef(null);
  useCssVar(cell, '--col-width', width);
  return (
    <th ref={cell} className={headerClass(column, width, folded)}>
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
  width: PropTypes.string,
  folded: PropTypes.bool.isRequired,
  sort: sortShape.isRequired,
  onSort: PropTypes.func.isRequired,
  onResize: PropTypes.func,
};

const HeaderRow = ({
  drawn,
  sized,
  folded,
  foldCell,
  selection,
  watches,
  actions,
  sort,
  onSort,
  onResize,
}) => {
  const { t } = useTranslation();
  return (
    <tr>
      {foldCell ? <th className="col-fold" /> : null}
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
          width={sized[column.key] || null}
          folded={folded.has(column.key)}
          sort={sort}
          onSort={onSort}
          onResize={onResize}
        />
      ))}
      {actions ? (
        <th className="col-actions">
          <span>{t('pages.table.actions')}</span>
        </th>
      ) : null}
    </tr>
  );
};

HeaderRow.propTypes = {
  drawn: PropTypes.array.isRequired,
  sized: PropTypes.objectOf(PropTypes.string).isRequired,
  folded: PropTypes.instanceOf(Set).isRequired,
  foldCell: PropTypes.bool.isRequired,
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

/**
 * The folded columns of one line as label and value pairs, in table
 * order, the value the cell would have drawn.
 */
const FoldedRecord = ({ drawn, folded, row, ctx }) => {
  const { t } = useTranslation();
  const rows = drawn
    .filter(column => folded.has(column.key))
    .map(column => ({
      key: column.key,
      label: t(column.labelKey),
      value: cellContent(column, row, ctx),
    }));
  return <RecordRows rows={rows} className="mb-0 record-folded" />;
};

FoldedRecord.propTypes = {
  drawn: PropTypes.array.isRequired,
  folded: PropTypes.instanceOf(Set).isRequired,
  row: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
};

const DetailRow = ({ columnCount, record, detail }) => (
  <tr className="detail-row">
    <td colSpan={columnCount}>
      {record}
      {detail}
    </td>
  </tr>
);

DetailRow.propTypes = {
  columnCount: PropTypes.number.isRequired,
  record: PropTypes.node,
  detail: PropTypes.node,
};

const BodyRow = ({
  row,
  drawn,
  folded,
  foldCell,
  openKeys,
  onToggleOpen,
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
  const key = rowKey(row);
  const expanded = Boolean(Detail && expandedKeys && expandedKeys.has(key));
  const open = foldCell && openKeys.has(key);
  return (
    <>
      <tr
        ref={rowRef ? rowRef(key) : undefined}
        tabIndex={rowRef ? -1 : undefined}
        id={rowId ? rowId(row) : undefined}
        className={rowClass ? rowClass(row) : undefined}
      >
        {foldCell ? (
          <td className="col-fold">
            <CollapseButton collapsed={!open} onToggle={() => onToggleOpen(key)} />
          </td>
        ) : null}
        {selection ? (
          <td className="col-select">
            <RowCheckbox selection={selection} row={row} />
          </td>
        ) : null}
        {watches ? (
          <td className="col-watch text-center align-middle">
            {watches.toggle ? (
              <WatchStar watched={watches.ids.has(key)} onToggle={() => watches.toggle(row)} />
            ) : null}
          </td>
        ) : null}
        {drawn.map(column => (
          <td key={column.key} className={cellClass(column, folded.has(column.key))}>
            <div className={column.prose ? 'cell prose' : 'cell'}>
              {cellContent(column, row, ctx)}
            </div>
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
      {open || expanded ? (
        <DetailRow
          columnCount={columnCount}
          record={open ? <FoldedRecord drawn={drawn} folded={folded} row={row} ctx={ctx} /> : null}
          detail={expanded ? <Detail {...detailProps} {...own} /> : null}
        />
      ) : null}
    </>
  );
};

BodyRow.propTypes = {
  row: PropTypes.object.isRequired,
  drawn: PropTypes.array.isRequired,
  folded: PropTypes.instanceOf(Set).isRequired,
  foldCell: PropTypes.bool.isRequired,
  openKeys: PropTypes.instanceOf(Set).isRequired,
  onToggleOpen: PropTypes.func.isRequired,
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
 * The shape one render of the table takes from its props: the columns
 * drawn (not hidden, and their `when` true for the rows and `ctx`),
 * whether an Actions column draws, and the count of cells a full-width
 * line spans, the fold cell added to it while anything is folded.
 *
 * @param {Object} props - The table's `columns`, `rows`, `hiddenColumns`, `selection`, `watches`, `LeadActions`, `RowActions` and `ctx`
 * @returns {{ drawn: Array, actions: boolean, columnCount: number }} The shape
 */
const shapeOf = ({
  columns,
  rows,
  hiddenColumns,
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
  const actions = Boolean(LeadActions || RowActions);
  const columnCount = drawn.length + [selection, watches, actions].filter(Boolean).length;
  return { drawn, actions, columnCount };
};

const sizedWidths = (drawn, widths, sharedWidths) =>
  Object.fromEntries(
    drawn
      .map(column => [column.key, widths[column.key] || sharedWidths?.[column.key] || 0])
      .filter(([, pixels]) => pixels > 0)
      .map(([key, pixels]) => [key, `${pixels}px`])
  );

const toggledIn = (set, key) => {
  const next = new Set(set);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  return next;
};

const tableClass = ownerFolded =>
  ownerFolded ? 'table items-table fold-owner' : 'table items-table';

const countWithFold = (shape, foldCell) => (foldCell ? shape.columnCount + 1 : shape.columnCount);

/**
 * The one table of the estate: the collection listings, the item, version
 * and provider detail pages, the admin lists, the fleet, the search page
 * and the organization console's lists. Draws the given columns in order,
 * each only when it is not in `hiddenColumns` and its `when` is absent or
 * true for the rows and `ctx` (so a column can read the viewer and the
 * host from `ctx` as well as the rows). A column is `{ key, kind,
 * labelKey, value, render?, priority?, prose? }`: `value(row, ctx)`
 * answers the one thing the cell shows, a string, a number, the instant
 * of a date or relative kind, the word of a badge or word kind, the
 * joined labels of a badges kind, and is what the cell draws unless
 * `render(row, ctx)` is given, a link or a composite that shows exactly
 * what `value` names; every header sorts by `value` through `sortItems`,
 * ascending, descending, then off, a Shift-click adding to the stack.
 * Each cell is one `td.col-<key>`, its content in one `.cell` block the
 * stylesheet styles by the column's kind (`prose` added while the column
 * is), every `th` and `td` also carrying the kind class of that `kind`
 * (`columnKinds`, `col-k-<kind>`) so the look comes from the kind alone,
 * never from a column key, and a column without a `kind` is a defect.
 * The table lays itself out (`table-layout: auto`, full width): every
 * column carries a priority, its own `priority` or the one its kind
 * seeds, 1 never folding; before paint the table measures what each
 * column needs, the widest of its header button and its cells (a `prose`
 * column, one whose cell wraps, capped at 24rem and a checksum at 14rem,
 * the one cell that keeps an ellipsis), and while the sizes of the drawn
 * columns and the Actions column exceed the wrap's room it folds the
 * highest priority number first, the rightmost among equals, the
 * organization in front of a name folding before any column; the size a
 * column counts is its stored resize over its `sharedWidths` entry over
 * its need. While anything is folded a leading fold cell opens each line
 * as a record of the folded columns under it, label and value pairs in
 * table order, the page's `Detail` drawn under that record in the same
 * cell when the line is expanded too; the wrap's resizes and the fonts'
 * readiness lay the table out again, and `onNeeds`, where given, is
 * handed the needs whenever a value changed, so a page listing several
 * tables can hand back `sharedWidths`. A leading select column draws
 * when `selection` is given (a real checkbox header, checked, unchecked
 * or indeterminate, the select-all for the page, and one row checkbox
 * per cell), the watch column after it when `watches` is given (a star
 * header sorting by `watch` and one star per row while `watches.toggle`
 * is set, the header star alone and blank cells otherwise, so a listing
 * keeps its shape signed out), an actions column when `LeadActions` or
 * `RowActions` is given, `LeadActions` the actions every viewer of the
 * row gets (a download), rendered with `ctx` plus the row under `rowProp`
 * and drawn first, `RowActions` the host's own, rendered with
 * `actionsProps` plus the row under `rowProp`, the class `rowClass`
 * answers on each row, one full-width detail row under every row whose
 * key is in `expandedKeys` (rendering `Detail` with `detailProps` plus
 * the row under `rowProp`), one `tbody` per group with a `GroupHeading`
 * row when `groups` is given (`collapsed[group.key]` folding it through
 * `onToggleGroup`, the count from `countKey`), a group with no items
 * keeping its heading over one full-width compact `EmptyState` row titled
 * `emptyText`, and, when there are no rows and no groups, the
 * `EmptyState` placard titled `emptyText` with `emptyBody` under it drawn
 * inside the wrap in place of the whole table, no header, so an empty
 * collection reads as a placard and not as a headed blank. `rowId`, where
 * given, is the DOM id each row carries, so a page can bring one row into
 * view; `rowRef`, where given, is `useArrival`'s `ref`, called with each
 * row's key, and every row then takes focus (`tabIndex` -1) so the
 * arrival rule's scroll and focus both land on it. Every data column's
 * header carries a resize handle on its right edge while `onResize` is
 * given, a button the way the sortable list's grip is: a drag calls
 * `onResize(key, pixels)` and shows the width, Left and Right nudge it by
 * 16px, a double-click, Enter or Home call `onResize(key, null)` to
 * reset; `widths` (column key to pixels) sets each column's width over
 * the measure, a hidden column keeping its entry; a sized header carries
 * `col-sized` and its width as `--col-width`.
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
  sharedWidths,
  onResize = null,
  onNeeds,
  ctx,
  emptyText,
  selection = null,
  watches = null,
  groups = null,
  collapsed = NO_COLLAPSED,
  onToggleGroup = null,
  countKey = '',
}) => {
  const wrapRef = useRef(null);
  const tableRef = useRef(null);
  const [openKeys, setOpenKeys] = useState(NO_FOLD);
  const shape = shapeOf({
    columns,
    rows,
    hiddenColumns,
    selection,
    watches,
    LeadActions,
    RowActions,
    ctx,
  });
  const { drawn, actions } = shape;
  const { folded, ownerFolded } = useFold({
    wrapRef,
    tableRef,
    drawn,
    rows,
    widths,
    sharedWidths,
    actions,
    selection,
    watches,
    language: ctx.language,
    onNeeds,
  });
  const foldCell = folded.size > 0;
  const columnCount = countWithFold(shape, foldCell);
  const rowProps = {
    drawn,
    folded,
    foldCell,
    openKeys,
    onToggleOpen: key => setOpenKeys(current => toggledIn(current, key)),
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
    <div ref={wrapRef} className="items-table-wrap">
      <Table ref={tableRef} striped className={tableClass(ownerFolded)}>
        <thead>
          <HeaderRow
            drawn={drawn}
            sized={sizedWidths(drawn, widths, sharedWidths)}
            folded={folded}
            foldCell={foldCell}
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
      priority: PropTypes.number,
      prose: PropTypes.bool,
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
  sharedWidths: PropTypes.objectOf(PropTypes.number),
  onResize: PropTypes.func,
  onNeeds: PropTypes.func,
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
