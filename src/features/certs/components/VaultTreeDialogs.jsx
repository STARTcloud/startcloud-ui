import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import ConfirmModal from '../../../components/common/ConfirmModal';
import { nameOf, relationships } from '../utils/records';

const linkedNames = (target, records) => {
  const related = relationships(target, records);
  return [...related.issued, ...related.signedWith].map(nameOf);
};

/**
 * The one delete dialog of the vault, the node the certs feature hands
 * the sidebar as its tree's `dialogs` and the vault page draws beside
 * its table: the typed confirmation of a Delete asked of one record,
 * naming the records linked to it, handing `onRemove` the record and
 * `onConfirmed` the dialog's leaving after the confirm; the local record
 * alone is removed.
 */
const VaultTreeDialogs = ({ target, records, onClose, onRemove, onConfirmed = null }) => {
  const { t } = useTranslation();
  const linked = target ? linkedNames(target, records) : [];
  return (
    <ConfirmModal
      show={Boolean(target)}
      handleClose={onClose}
      handleConfirm={() => onRemove(target)}
      onConfirmed={onConfirmed}
      title={t('certs.confirm.deleteTitle')}
      message={
        linked.length > 0
          ? `${t('certs.confirm.deleteMessage', { name: nameOf(target) })} ${t('certs.confirm.deleteLinked', { names: linked.join(', '), count: linked.length })}`
          : t('certs.confirm.deleteMessage', { name: target ? nameOf(target) : '' })
      }
    />
  );
};

VaultTreeDialogs.propTypes = {
  target: PropTypes.object,
  records: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onConfirmed: PropTypes.func,
};

export default VaultTreeDialogs;
