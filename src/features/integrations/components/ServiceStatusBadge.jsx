import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const STATUS_CLASSES = {
  connected: 'bg-success',
  expired: 'bg-warning text-dark',
  error: 'bg-danger',
};

/**
 * The status badge of a connected service, `connected`, `expired` or
 * `error` in its colour, drawn by the Integrations page's rows and by the
 * Hyperweaver card alike.
 */
const ServiceStatusBadge = ({ status }) => {
  const { t } = useTranslation();
  if (!status) {
    return null;
  }
  return (
    <span className={`badge ${STATUS_CLASSES[status] || 'bg-secondary'}`}>
      {t(`integrations.status.${status}`, { defaultValue: status })}
    </span>
  );
};

ServiceStatusBadge.propTypes = {
  status: PropTypes.string,
};

export default ServiceStatusBadge;
