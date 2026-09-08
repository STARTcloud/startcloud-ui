import PropTypes from 'prop-types';
import { useState } from 'react';
import { FaCircleUser } from 'react-icons/fa6';

const Avatar = ({ picture = '', size, fallback = null }) => {
  const [failed, setFailed] = useState('');
  if (!picture || failed === picture) {
    return fallback || <FaCircleUser size={size} className="flex-shrink-0" aria-hidden />;
  }
  return (
    <img
      src={picture}
      alt=""
      width={size}
      height={size}
      className="rounded-circle flex-shrink-0"
      onError={() => setFailed(picture)}
    />
  );
};

Avatar.propTypes = {
  picture: PropTypes.string,
  size: PropTypes.number.isRequired,
  fallback: PropTypes.node,
};

export default Avatar;
