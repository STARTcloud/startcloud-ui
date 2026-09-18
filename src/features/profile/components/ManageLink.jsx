import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { httpsUrl } from '../../../components/common/MethodList';

/**
 * Whether the adapter's record is the identity provider's, drawn
 * read-only with the Manage at identity provider link (RFC 7643 §2.2
 * `readOnly`; RFC 7644 §3.5.2, a client never writes such an attribute).
 *
 * @param {Object} account - The `account` adapter
 * @returns {boolean} True for a `readOnly` adapter
 */
export const isReadOnly = account => account.mutability === 'readOnly';

/**
 * The one link every read-only section draws in its heading: the identity
 * provider's own profile page, where the record is edited; drawn only
 * while the adapter is `readOnly` and names an `https:` `manageUrl`.
 */
const ManageLink = ({ account, className = 'btn btn-sm btn-outline-primary' }) => {
  const { t } = useTranslation();
  const url = isReadOnly(account) ? httpsUrl(account.manageUrl) : '';
  if (!url) {
    return null;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      {t('profile.manageAtProvider')}
    </a>
  );
};

ManageLink.propTypes = {
  account: PropTypes.shape({
    mutability: PropTypes.string.isRequired,
    manageUrl: PropTypes.string,
  }).isRequired,
  className: PropTypes.string,
};

export default ManageLink;
