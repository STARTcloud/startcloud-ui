import PropTypes from 'prop-types';
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa6';

import { sortShape } from '../utils/itemShape';

const SortIcon = ({ column, sort }) => {
  const index = sort.findIndex(entry => entry.column === column);
  if (index === -1) {
    return <FaSort />;
  }
  const Icon = sort[index].direction === 'asc' ? FaSortUp : FaSortDown;
  return (
    <>
      <Icon />
      {sort.length > 1 ? <sup className="text-success">{index + 1}</sup> : null}
    </>
  );
};

SortIcon.propTypes = {
  column: PropTypes.string.isRequired,
  sort: sortShape.isRequired,
};

/**
 * A table header cell's content for a sortable column: the given label as a
 * button that cycles the column's sort, a Shift-click adding it to the
 * stack instead, followed by the icon of its current direction and, while
 * the stack holds more than one entry, its position in it.
 */
const SortHeader = ({ column, sort, onSort, children }) => (
  <button
    type="button"
    className="btn btn-link btn-sm p-0 fw-bold text-body text-decoration-none text-nowrap"
    onClick={event => onSort(column, { append: event.shiftKey })}
  >
    {children} <SortIcon column={column} sort={sort} />
  </button>
);

SortHeader.propTypes = {
  column: PropTypes.string.isRequired,
  sort: sortShape.isRequired,
  onSort: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

export default SortHeader;
