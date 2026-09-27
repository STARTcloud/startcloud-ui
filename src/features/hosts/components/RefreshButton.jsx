import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaRotate } from 'react-icons/fa6';

/**
 * Refresh in the heading's actions of a hosts page, the pages contract's
 * section action: one press reads again what the page draws, the read a
 * person asks for, and nothing reads on a clock.
 */
const RefreshButton = ({ onRefresh }) => {
  const { t } = useTranslation();
  return (
    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onRefresh}>
      <FaRotate className="me-1" aria-hidden="true" />
      {t('hosts.page.refresh')}
    </button>
  );
};

RefreshButton.propTypes = {
  onRefresh: PropTypes.func.isRequired,
};

export default RefreshButton;
