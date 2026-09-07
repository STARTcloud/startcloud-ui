import PropTypes from 'prop-types';

/**
 * The `overflow-x: auto` wrapper every admin table sits in, so the page
 * body never scrolls sideways.
 */
const TableWrap = ({ children }) => <div className="table-wrap">{children}</div>;

TableWrap.propTypes = {
  children: PropTypes.node.isRequired,
};

export default TableWrap;
