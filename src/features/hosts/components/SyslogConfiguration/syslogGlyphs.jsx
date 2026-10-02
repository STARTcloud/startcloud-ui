import PropTypes from 'prop-types';
import {
  FaCircleQuestion,
  FaCode,
  FaCodeBranch,
  FaFileLines,
  FaFolderOpen,
  FaGears,
  FaPlay,
  FaPuzzlePiece,
  FaRightToBracket,
  FaServer,
  FaStop,
  FaUser,
  FaUsers,
} from 'react-icons/fa6';

const GLYPHS = {
  gears: FaGears,
  file: FaFileLines,
  question: FaCircleQuestion,
  server: FaServer,
  users: FaUsers,
  user: FaUser,
  code: FaCode,
  branch: FaCodeBranch,
  play: FaPlay,
  stop: FaStop,
  puzzle: FaPuzzlePiece,
  folder: FaFolderOpen,
  input: FaRightToBracket,
};

/**
 * The glyph of a syslog service type or an action type, hyperweaver-ui's
 * FontAwesome class as a react-icons glyph by the key `syslogUtils`
 * answers.
 */
const SyslogGlyph = ({ name, className = 'me-1' }) => {
  const Icon = GLYPHS[name] || FaCircleQuestion;
  return <Icon className={className} aria-hidden="true" />;
};

SyslogGlyph.propTypes = {
  name: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default SyslogGlyph;
