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

const regionalIndicator = letter => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65);

const flagOf = code => [...code.toUpperCase()].map(regionalIndicator).join('');

/**
 * The flag mark of a terms copy's `regions` entry: a country code draws
 * that country's flag, `EU` the EU flag, `EEA` the EU flag with the
 * letters EEA beside it, `UK` the Union Jack (the `GB` flag, `UK` naming
 * no country of its own); every mark an emoji flag sequence, so no asset
 * or dependency carries it.
 */
export const RegionFlag = ({ region, className = '', ...aria }) => {
  if (region === 'EEA') {
    return (
      <span className={className} {...aria}>
        {flagOf('EU')} <span className="small">EEA</span>
      </span>
    );
  }
  if (region === 'UK') {
    return (
      <span className={className} {...aria}>
        {flagOf('GB')}
      </span>
    );
  }
  return (
    <span className={className} {...aria}>
      {flagOf(region)}
    </span>
  );
};

RegionFlag.propTypes = {
  region: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default TermIcon;
