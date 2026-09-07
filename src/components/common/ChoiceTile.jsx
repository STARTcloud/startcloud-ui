import PropTypes from 'prop-types';

/**
 * A large icon tile rendered as a button, so it takes focus, Enter and
 * Space: the glyph, the title and the description.
 */
const ChoiceTile = ({ icon, title, description, onClick, disabled = false }) => (
  <button type="button" className="choice-tile" onClick={onClick} disabled={disabled}>
    <span className="choice-tile-icon" aria-hidden="true">
      {icon}
    </span>
    <span className="choice-tile-title">{title}</span>
    <span className="choice-tile-description">{description}</span>
  </button>
);

ChoiceTile.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.node.isRequired,
  description: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ChoiceTile;
