import PropTypes from 'prop-types';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';

export const toggleShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  tone: PropTypes.string.isRequired,
});

/**
 * The buttons that show and hide the series of a chart, one per group of
 * series: pressed and in its tone while the group shows, outlined while
 * it is hidden, the eye and the struck eye saying which, `title` the
 * sentence of its tooltip.
 */
const SeriesToggles = ({ toggles, visibility, onToggle }) => (
  <span className="d-inline-flex flex-wrap gap-1">
    {toggles.map(toggle => {
      const shown = Boolean(visibility[toggle.key]);
      const Glyph = shown ? FaEye : FaEyeSlash;
      return (
        <button
          key={toggle.key}
          type="button"
          className={`btn btn-sm ${shown ? `btn-${toggle.tone}` : 'btn-outline-secondary'}`}
          title={toggle.title}
          aria-pressed={shown}
          data-series={toggle.key}
          onClick={() => onToggle(toggle.key)}
        >
          <Glyph className="me-1" aria-hidden="true" />
          {toggle.label}
        </button>
      );
    })}
  </span>
);

SeriesToggles.propTypes = {
  toggles: PropTypes.arrayOf(toggleShape).isRequired,
  visibility: PropTypes.objectOf(PropTypes.bool).isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default SeriesToggles;
