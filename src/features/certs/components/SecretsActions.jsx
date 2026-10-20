import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaArrowsRotate } from 'react-icons/fa6';

import SplitButton from '../../../components/common/SplitButton';
import { formatRelativeTime } from '../../../utils/relativeTime';

/**
 * The Actions group of a page of secrets' heading pane: the muted Last
 * synced line, the instant a mirror last completed a run or never, then
 * the Actions split button, its press Sync now and its menu the page's
 * bulk verbs over the picked rows, each `{ action, labelKey, onClick,
 * disabled }`; every press held while `busy`.
 */
const SecretsActions = ({ lastSynced, busy, onSync, items }) => {
  const { t, i18n } = useTranslation();
  return (
    <span className="d-inline-flex align-items-center gap-2" data-pane="secrets-actions">
      <span className="small text-muted" data-note="last-synced">
        {lastSynced
          ? t('certs.sync.lastSynced', { when: formatRelativeTime(lastSynced, i18n.language) })
          : t('certs.sync.never')}
      </span>
      <SplitButton
        action="sync-now"
        labelKey="certs.stores.syncNow"
        icon={FaArrowsRotate}
        onClick={onSync}
        items={items}
        menuAction="secrets-actions"
        menuLabelKey="certs.stores.actions"
        variant="outline-primary"
        busy={busy}
      />
    </span>
  );
};

SecretsActions.propTypes = {
  lastSynced: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onSync: PropTypes.func.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      action: PropTypes.string.isRequired,
      labelKey: PropTypes.string.isRequired,
      onClick: PropTypes.func.isRequired,
      disabled: PropTypes.bool,
    })
  ).isRequired,
};

export default SecretsActions;
