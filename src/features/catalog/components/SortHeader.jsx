import PropTypes from 'prop-types';
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa6';

import { sortShape } from '../utils/itemShape';

const SortIcon = ({ column, sort }) => {
  if (sort.column !== column) {
    return <FaSort />;
  }
  return sort.direction === 'asc' ? <FaSortUp /> : <FaSortDown />;
};

SortIcon.propTypes = {
  column: PropTypes.string.isRequired,
  sort: sortShape.isRequired,
};

/**
 * A table header cell's content for a sortable column: the given label as a
 * button that cycles the column's sort, followed by the icon of its current
 * direction.
 */
const SortHeader = ({ column, sort, onSort, children }) => (
  <button
    type="button"
    className="btn btn-link btn-sm p-0 fw-bold text-body text-decoration-none text-nowrap"
    onClick={() => onSort(column)}
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
