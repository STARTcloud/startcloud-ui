import PropTypes from 'prop-types';

import { brandLogoUrl } from '../../config/brand';
import { useStatus } from '../../contexts/StatusContext';

/**
 * The host's brand mark from `status.brand`, the file painting its own
 * light and dark variant; sized by the caller's class.
 */
const BrandLogo = ({ className }) => {
  const { brand } = useStatus();
  return <img src={brandLogoUrl(brand)} alt="" className={className} />;
};

BrandLogo.propTypes = {
  className: PropTypes.string.isRequired,
};

export default BrandLogo;
