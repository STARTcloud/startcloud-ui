import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCloudArrowDown } from 'react-icons/fa6';

/**
 * Pull to vault on one store row, Pull again while the vault already
 * keeps a record of it; `held` the ids of the rows kept, `onPull(row)`
 * the pull.
 */
const PullAction = ({ row, held, onPull }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-primary"
      data-action="pull"
      onClick={() => onPull(row)}
    >
      <FaCloudArrowDown className="me-1" aria-hidden="true" />
      {t(held.has(row.id) ? 'certs.shared.pullAgain' : 'certs.shared.pull')}
    </button>
  );
};

PullAction.propTypes = {
  row: PropTypes.object.isRequired,
  held: PropTypes.instanceOf(Set).isRequired,
  onPull: PropTypes.func.isRequired,
};

export default PullAction;
