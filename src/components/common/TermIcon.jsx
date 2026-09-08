import PropTypes from 'prop-types';
import {
  FaFileContract,
  FaFileLines,
  FaLock,
  FaScaleBalanced,
  FaShield,
  FaShieldHalved,
} from 'react-icons/fa6';

const GLYPHS = {
  'file-text': FaFileLines,
  'file-contract': FaFileContract,
  shield: FaShield,
  'shield-lock': FaShieldHalved,
  lock: FaLock,
  scale: FaScaleBalanced,
};

/**
 * The glyph names a term or policy's `icon` may carry, in the order the
 * icon picker offers them.
 */
export const TERM_ICON_NAMES = Object.keys(GLYPHS);

/**
 * The estate glyph for a term or policy's `icon` name, the `file-text`
 * glyph when the name is not one the estate knows; `className` and the
 * ARIA attributes reach the glyph unchanged.
 */
const TermIcon = ({ icon = '', className = '', ...aria }) => {
  const Glyph = GLYPHS[icon] || GLYPHS['file-text'];
  return <Glyph className={className} {...aria} />;
};

TermIcon.propTypes = {
  icon: PropTypes.string,
  className: PropTypes.string,
};

export default TermIcon;
