import PropTypes from 'prop-types';
import { FaCheck, FaXmark } from 'react-icons/fa6';

import { vmHasNoSession, vmIsStandby } from '../utils/vmStatus';

/**
 * The desktop icon count of a VM with a check when it meets the pool's
 * threshold and a cross when it does not; a dash without a session.
 */
const IconsCell = ({ vm }) => {
  if (vmIsStandby(vm) || vmHasNoSession(vm)) {
    return <span className="text-body-tertiary">—</span>;
  }
  const status = vm.desktop?.status;
  const count = vm.desktop?.icon_count ?? '—';
  if (status === 'ok') {
    return (
      <span className="text-success">
        {count} <FaCheck aria-hidden />
      </span>
    );
  }
  if (status === 'n_a') {
    return <span>{count}</span>;
  }
  return (
    <span className="text-danger">
      {count} <FaXmark aria-hidden />
    </span>
  );
};

IconsCell.propTypes = {
  vm: PropTypes.object.isRequired,
};

export default IconsCell;
