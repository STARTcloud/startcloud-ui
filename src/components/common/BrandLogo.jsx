import PropTypes from 'prop-types';

import { brandLogoUrl, brandWordmarkUrl } from '../../config/brand';
import { useStatus } from '../../contexts/StatusContext';

/**
 * The host's brand mark from `status.brand`, or its wordmark, `logo.svg`
 * beside the mark, while `wordmark` is set; the file painting its own
 * light and dark variant; sized by the caller's class.
 */
const BrandLogo = ({ className, wordmark = false }) => {
  const { brand } = useStatus();
  const src = wordmark ? brandWordmarkUrl(brand) : brandLogoUrl(brand);
  return <img src={src} alt="" className={className} />;
};

BrandLogo.propTypes = {
  className: PropTypes.string.isRequired,
  wordmark: PropTypes.bool,
};

export default BrandLogo;
