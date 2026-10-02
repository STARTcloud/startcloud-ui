import PropTypes from 'prop-types';

import { brandLogoUrl, brandMarkUrl, brandWordmarkUrl } from '../../config/brand';
import { useStatus } from '../../contexts/StatusContext';
import { useChosenTheme } from '../../hooks/useTheme';

import { useFallbackSrc } from './useFallbackSrc';

/**
 * The mark of the page, the chosen theme's `logo` while the person chose
 * a pack that carries one and the host's brand mark from `status.brand`
 * otherwise, a pack logo that fails to load swapped once to the host's
 * mark, or the host's wordmark, `logo.svg` beside its mark, while
 * `wordmark` is set; the file painting its own light and dark variant;
 * sized by the caller's class.
 */
const BrandLogo = ({ className, wordmark = false }) => {
  const { brand } = useStatus();
  const { theme, themes } = useChosenTheme();
  const asked = wordmark ? brandWordmarkUrl(brand) : brandMarkUrl(brand, theme, themes);
  const { src, onError } = useFallbackSrc(asked, wordmark ? asked : brandLogoUrl(brand));
  return <img src={src} onError={onError} alt="" className={className} />;
};

BrandLogo.propTypes = {
  className: PropTypes.string.isRequired,
  wordmark: PropTypes.bool,
};

export default BrandLogo;
