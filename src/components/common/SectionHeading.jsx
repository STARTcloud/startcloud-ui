import PropTypes from 'prop-types';

/**
 * The heading line of a glass section of the pages contract, the line a
 * list or a table draws over its rows straight on the page's ground: the
 * same icon, title, trailing badge and actions slots as `SectionCard`'s
 * header row, no body and no fold, because a list reads better without a
 * frame and one heading shape keeps every page of every UI backend alike.
 */
const SectionHeading = ({
  icon = null,
  title,
  badge = null,
  actions = null,
  id = undefined,
  className = 'mb-3',
}) => (
  <div className={`section-heading d-flex align-items-center flex-wrap gap-2 ${className}`} id={id}>
    {icon ? <span className="d-inline-flex">{icon}</span> : null}
    <h5 className="mb-0 section-card-title">{title}</h5>
    {badge}
    {actions ? (
      <span className="d-flex align-items-center flex-wrap gap-2 ms-auto">{actions}</span>
    ) : null}
  </div>
);

SectionHeading.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.node.isRequired,
  badge: PropTypes.node,
  actions: PropTypes.node,
  id: PropTypes.string,
  className: PropTypes.string,
};

export default SectionHeading;
