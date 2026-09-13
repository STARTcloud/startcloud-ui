import PropTypes from 'prop-types';

/**
 * The heading line of a glass section of the pages contract, the line a
 * list or a table draws over its rows straight on the page's ground: the
 * title, the count or state as muted text after it, a trailing badge and
 * the action-pane slot, no icon, no body and no fold, because a list reads
 * better without a frame and one heading shape keeps every page of every
 * UI backend alike.
 */
const SectionHeading = ({
  title,
  count = null,
  state = null,
  badge = null,
  actions = null,
  id = undefined,
  className = 'mb-3',
}) => (
  <div className={`section-heading d-flex align-items-center flex-wrap gap-2 ${className}`} id={id}>
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

SectionHeading.propTypes = {
  title: PropTypes.node.isRequired,
  count: PropTypes.node,
  state: PropTypes.oneOf(['success', 'warning']),
  badge: PropTypes.node,
  actions: PropTypes.node,
  id: PropTypes.string,
  className: PropTypes.string,
};

export default SectionHeading;
