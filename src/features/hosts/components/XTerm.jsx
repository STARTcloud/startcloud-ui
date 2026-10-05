import PropTypes from 'prop-types';

import { useXTerm } from '../hooks/useXTerm';

/**
 * The element an xterm Terminal of `useXTerm` opens on, over the
 * `options` and `addons` given, the rest of the props on the element.
 */
const XTerm = ({ className = '', options, addons, ...props }) => {
  const { ref } = useXTerm({ options, addons });
  return <div className={className} ref={ref} {...props} />;
};

XTerm.propTypes = {
  className: PropTypes.string,
  options: PropTypes.object,
  addons: PropTypes.array,
};

export default XTerm;
