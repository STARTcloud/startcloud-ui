import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { useNotify } from '../../../contexts/NoticeContext';

/**
 * One checksum drawn anywhere a table cell or facts row shows it: the type
 * as a badge when known, the full checksum truncated to fit its cell with
 * the full `type:checksum` as the title, and a click that copies the
 * checksum to the clipboard and raises the page notice.
 */
const ChecksumCell = ({ checksum, checksumType = '' }) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const title = checksumType ? `${checksumType}:${checksum}` : checksum;
  const copy = () => {
    navigator.clipboard.writeText(checksum).then(
      () => notify('success', t('pages.provider.checksumCopied')),
      () => notify('danger', t('pages.provider.copyFailed'))
    );
  };
  return (
    <span className="d-inline-flex align-items-center gap-1 mw-100">
      {checksumType ? (
        <span className="badge bg-secondary flex-shrink-0">{checksumType}</span>
      ) : null}
      <button
        type="button"
        className="btn btn-link p-0 border-0 min-width-0 mw-100 text-start"
        onClick={copy}
        aria-label={t('pages.provider.clickToCopy')}
      >
        <code className="checksum text-truncate d-inline-block mw-100 v-align-middle" title={title}>
          {checksum}
        </code>
      </button>
    </span>
  );
};

ChecksumCell.propTypes = {
  checksum: PropTypes.string.isRequired,
  checksumType: PropTypes.string,
};

export default ChecksumCell;
