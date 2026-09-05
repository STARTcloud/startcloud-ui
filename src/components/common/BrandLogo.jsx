import PropTypes from 'prop-types';

import { brandLogoUrl } from '../../config/brand';
import { useStatus } from '../../contexts/StatusContext';

/**
 * The host's brand mark from `status.brand`, the dark variant when this
 * build ships one and the theme is dark; sized by the caller's class.
 */
const BrandLogo = ({ theme, className }) => {
  const { brand } = useStatus();
  return <img src={brandLogoUrl(brand, theme)} alt="" className={className} />;
};

BrandLogo.propTypes = {
  theme: PropTypes.string.isRequired,
  className: PropTypes.string.isRequired,
};

export default BrandLogo;
