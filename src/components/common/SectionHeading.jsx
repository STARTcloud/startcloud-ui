import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';

export const headingSelectAllShape = PropTypes.shape({
  allSelected: PropTypes.bool.isRequired,
  someSelected: PropTypes.bool.isRequired,
  onToggleAll: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
});

/**
 * The heading line of a glass section of the pages contract, the line a
 * list or a table draws over its rows straight on the page's ground: the
 * title, the count or state as muted text after it, a trailing badge and
 * the action-pane slot, no icon, no body and no fold, because a list reads
 * better without a frame and one heading shape keeps every page of every
 * UI backend alike. `selectAll`, given only on a card list with no table
 * header of its own (the Terms cards), draws the select-all checkbox at
 * the title's leading edge, exactly where a table's header checkbox sits.
 */
const SectionHeading = ({
  title,
  count = null,
  state = null,
  badge = null,
  actions = null,
  id = undefined,
  className = 'mb-3',
  selectAll = null,
}) => {
  const selectAllRef = useRef(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = Boolean(
        selectAll && selectAll.someSelected && !selectAll.allSelected
      );
    }
  }, [selectAll]);
  return (
    <div
      className={`section-heading d-flex align-items-center flex-wrap gap-2 ${className}`}
      id={id}
    >
      {selectAll ? (
        <input
          ref={selectAllRef}
          type="checkbox"
          className="form-check-input"
          checked={selectAll.allSelected}
          onChange={selectAll.onToggleAll}
          aria-label={selectAll.label}
        />
      ) : null}
      <h5 className="mb-0 section-card-title">{title}</h5>
      {count !== null ? (
        <span className={`small ${state ? `text-${state}` : 'text-muted'}`}>· {count}</span>
      ) : null}
      {badge}
      {actions ? (
        <span className="d-flex align-items-center flex-wrap gap-2 ms-auto">{actions}</span>
      ) : null}
    </div>
  );
};

SectionHeading.propTypes = {
  title: PropTypes.node.isRequired,
  count: PropTypes.node,
  state: PropTypes.oneOf(['success', 'warning']),
  badge: PropTypes.node,
  actions: PropTypes.node,
  id: PropTypes.string,
  className: PropTypes.string,
  selectAll: headingSelectAllShape,
};

export default SectionHeading;
