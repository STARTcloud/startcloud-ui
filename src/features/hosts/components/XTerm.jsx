import PropTypes from 'prop-types';
import { useEffect } from 'react';

import { useXTerm } from '../hooks/useXTerm';

/**
 * The element an xterm Terminal of `useXTerm` opens on, over the
 * `options` and `addons` given, the rest of the props on the element;
 * `onTerminal` is handed the terminal once it is made.
 */
const XTerm = ({ className = '', options, addons, onTerminal = null, ...props }) => {
  const { ref, instance } = useXTerm({ options, addons });

  useEffect(() => {
    onTerminal?.(instance);
  }, [instance, onTerminal]);

  return <div className={className} ref={ref} {...props} />;
};

XTerm.propTypes = {
  className: PropTypes.string,
  options: PropTypes.object,
  addons: PropTypes.array,
  onTerminal: PropTypes.func,
};

export default XTerm;
