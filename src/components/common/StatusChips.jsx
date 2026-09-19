import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const VISIBILITY_CLASS = {
  public: 'bg-info',
  guests: 'bg-primary bg-opacity-75',
  private: 'bg-secondary',
};

/**
 * The one visibility badge of the estate, Public, Guests or Private in its
 * own colour, drawn on the item cards, the item heading and the Visibility
 * column alike; nothing while the item carries no visibility.
 */
export const VisibilityBadge = ({ visibility = null }) => {
  const { t } = useTranslation();
  if (!visibility) {
    return null;
  }
  return (
    <span className={`badge ${VISIBILITY_CLASS[visibility]}`}>
      {t(`pages.status.${visibility}`)}
    </span>
  );
};

VisibilityBadge.propTypes = {
  visibility: PropTypes.oneOf(['public', 'guests', 'private']),
};

const StatusChips = ({ status = null, visibility = null, osLabel = null, deprecated = false }) => {
  const { t } = useTranslation();
  return (
    <>
      {status ? (
        <span className={`badge ${status === 'published' ? 'bg-success' : 'bg-warning'}`}>
          {t(status === 'published' ? 'pages.status.published' : 'pages.status.pending')}
        </span>
      ) : null}
      <VisibilityBadge visibility={visibility} />
      {osLabel ? <span className="badge badge-os">{osLabel}</span> : null}
      {deprecated ? <span className="badge bg-danger">{t('pages.status.deprecated')}</span> : null}
    </>
  );
};

StatusChips.propTypes = {
  status: PropTypes.oneOf(['published', 'pending']),
  visibility: PropTypes.oneOf(['public', 'guests', 'private']),
  osLabel: PropTypes.string,
  deprecated: PropTypes.bool,
};

export default StatusChips;
