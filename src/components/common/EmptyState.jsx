import PropTypes from 'prop-types';
import { FaBoxOpen } from 'react-icons/fa6';

/**
 * The one empty placard of the estate, drawn wherever a collection, a
 * table or a card grid has nothing to show: a centred block on the page
 * ground with a large muted glyph (`glyph`, a react-icons component,
 * `FaBoxOpen` by default), the `title` line and, when given, the `body`
 * line under it; `className` adds to the block, `empty-state-sm` being the
 * compact form a table group's body draws.
 */
const EmptyState = ({ title, body = null, glyph: Glyph = FaBoxOpen, className = '' }) => (
  <div className={className ? `empty-state ${className}` : 'empty-state'} role="status">
    <Glyph className="empty-state-glyph" aria-hidden="true" />
    <div className="empty-state-title">{title}</div>
    {body ? <div className="empty-state-body">{body}</div> : null}
  </div>
);

EmptyState.propTypes = {
  title: PropTypes.node.isRequired,
  body: PropTypes.node,
  glyph: PropTypes.elementType,
  className: PropTypes.string,
};

export default EmptyState;
