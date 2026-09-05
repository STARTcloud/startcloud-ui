import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { cacheBadgeClass, cacheLabel } from '../utils/cacheLevel';

/**
 * The cache-level badge of a VM's UDS entry: In use, Assigned, Available
 * or Standby in its own tint; nothing without UDS data.
 */
const CacheBadge = ({ uds = null, className = '' }) => {
  const { t } = useTranslation();
  const label = cacheLabel(uds, t);
  if (!label) {
    return null;
  }
  return <span className={`badge ${cacheBadgeClass(uds)} ${className}`}>{label}</span>;
};

CacheBadge.propTypes = {
  uds: PropTypes.object,
  className: PropTypes.string,
};

export default CacheBadge;
