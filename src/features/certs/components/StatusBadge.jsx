import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { STATUS_CLASSES } from '../utils/records';

/**
 * The one expiry badge of the feature: valid in the success tone,
 * expiring in the warning tone and expired in the danger tone; nothing
 * for a thing with no end.
 */
const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  if (!status) {
    return null;
  }
  return (
    <span className={`badge ${STATUS_CLASSES[status] || 'text-bg-secondary'}`} data-status={status}>
      {t(`certs.status.${status}`)}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
};

export default StatusBadge;
