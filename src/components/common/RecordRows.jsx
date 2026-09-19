import PropTypes from 'prop-types';

/**
 * The read-only rows of one record, the shape the organization console's
 * profile and the Users record page share: one `dl` whose every row is
 * the label in the leading column and the value, any node, beside it,
 * `className` on the list itself.
 */
const RecordRows = ({ rows, className = 'mb-3' }) => (
  <dl className={className}>
    {rows.map(row => (
      <div key={row.key} className="row mb-1">
        <dt className="col-sm-3">{row.label}</dt>
        <dd className="col-sm-9 mb-1">{row.value}</dd>
      </div>
    ))}
  </dl>
);

RecordRows.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.node.isRequired,
      value: PropTypes.node,
    })
  ).isRequired,
  className: PropTypes.string,
};

export default RecordRows;
