import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaArrowDownWideShort } from 'react-icons/fa6';

import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import { sortShape } from '../../../utils/itemShape';

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

const NO_PROPS = {};

const EMPTY_KEYS = {
  loading: 'pages.loading',
  failed: 'hosts.overview.readError',
  filtered: 'pages.noMatches',
};

/**
 * The title of one table of the networking page, hyperweaver-ui's: its
 * words, and where the table hands `onReset`, hyperweaver-ui's heading
 * button, a click dropping the sort a person chose, its tooltip saying
 * so, the glyph of a sort by several columns after the words while the
 * sort holds more than one.
 */
const TableTitle = ({ text, sort, onReset = null, resetTitle = '' }) => {
  if (!onReset) {
    return text;
  }
  return (
    <button
      type="button"
      className="btn btn-link p-0 border-0 text-reset text-decoration-none fw-medium fs-5 lh-sm align-baseline"
      title={resetTitle}
      data-tool="reset-sort"
      onClick={onReset}
    >
      {text}
      {sort.length > 1 ? (
        <FaArrowDownWideShort
          className="text-info ms-2"
          aria-hidden="true"
          data-note="multi-sort"
        />
      ) : null}
    </button>
  );
};

TableTitle.propTypes = {
  text: PropTypes.string.isRequired,
  sort: sortShape.isRequired,
  onReset: PropTypes.func,
  resetTitle: PropTypes.string,
};

/**
 * One table of the networking page, a glass section that folds: the
 * heading with the table's title, the count where the section
 * gives one, its actions, the management sections' Create, in the
 * action-pane slot, and the chevron that folds it, the fold kept in the
 * page's preferences, and under it, while it is not folded, the one
 * `SubTable` over the rows the page's one search binding left, in the
 * table's own sort, hidden columns and widths, `RowActions` drawn on
 * every row where the section hands them. While the read has not
 * answered the table draws the loading line, the read error when it
 * failed, the no matches line while a query or a filter left no row,
 * and the table's own empty line otherwise; `data-state` names which of
 * them stands. A read table carries `panel` as `data-panel`; a
 * management section, `section`, carries it as `data-section`, so the
 * read surfaces keep their count.
 */
const NetworkingTable = ({
  panel,
  title,
  columns,
  table,
  rowKey,
  ctx,
  emptyKey,
  reading,
  filtering,
  fold,
  resetTitle = '',
  count = null,
  actions = null,
  RowActions = null,
  actionsProps = NO_PROPS,
  section = false,
}) => {
  const { t } = useTranslation();
  const state = stateOf({ ...reading, filtering, rows: table.rows.length });
  const heading = (
    <TableTitle
      text={title}
      sort={table.sort}
      onReset={resetTitle ? table.resetSort : null}
      resetTitle={resetTitle}
    />
  );
  const mark = section ? { 'data-section': panel } : { 'data-panel': panel };
  return (
    <div {...mark} data-state={state} data-folded={fold.folded} className="mb-3">
      <SectionHeading
        title={heading}
        count={count}
        actions={actions}
        folded={fold.folded}
        onFold={fold.onFold}
        foldTitle={fold.title}
      />
      {fold.folded ? null : (
        <SubTable
          columns={columns}
          rows={table.rows}
          rowKey={rowKey}
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
      )}
    </div>
  );
};

NetworkingTable.propTypes = {
  panel: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  columns: PropTypes.array.isRequired,
  table: PropTypes.shape({
    rows: PropTypes.array.isRequired,
    sort: sortShape.isRequired,
    setSort: PropTypes.func.isRequired,
    resetSort: PropTypes.func.isRequired,
    hiddenColumns: PropTypes.instanceOf(Set).isRequired,
    widths: PropTypes.objectOf(PropTypes.number).isRequired,
    setColumnWidth: PropTypes.func.isRequired,
  }).isRequired,
  rowKey: PropTypes.func.isRequired,
  ctx: PropTypes.object.isRequired,
  emptyKey: PropTypes.string.isRequired,
  reading: PropTypes.shape({
    loaded: PropTypes.bool.isRequired,
    failed: PropTypes.bool.isRequired,
  }).isRequired,
  filtering: PropTypes.bool.isRequired,
  fold: PropTypes.shape({
    folded: PropTypes.bool.isRequired,
    onFold: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
  resetTitle: PropTypes.string,
  count: PropTypes.node,
  actions: PropTypes.node,
  RowActions: PropTypes.elementType,
  actionsProps: PropTypes.object,
  section: PropTypes.bool,
};

export default NetworkingTable;
