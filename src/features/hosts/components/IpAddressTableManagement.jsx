import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaPause, FaPen, FaPlay, FaTrash } from 'react-icons/fa6';

import { canDisableAddress, canEnableAddress } from '../utils/networkingManagement';

/**
 * The actions of one row of the addresses table, hyperweaver-ui's, on a
 * row the managed read answers alone and nothing on any other: Enable
 * while the managed address reads disabled, Disable while it reads ok,
 * Edit, opening the address form on the row, and Delete always, each
 * handed the managed row, every button held while a request is in
 * flight.
 */
export const IpAddressRowActions = ({ row, busy, onEnable, onDisable, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const own = row.managed;
  if (!own) {
    return null;
  }
  return (
    <>
      {canEnableAddress(own) ? (
        <button
          type="button"
          className="btn btn-sm btn-success"
          onClick={() => onEnable(own)}
          disabled={busy}
          title={t('host.ipAddressTableManagement.enableAddress')}
          data-tool="enable"
        >
          <FaPlay aria-hidden="true" />
        </button>
      ) : null}
      {canDisableAddress(own) ? (
        <button
          type="button"
          className="btn btn-sm btn-warning"
          onClick={() => onDisable(own)}
          disabled={busy}
          title={t('host.ipAddressTableManagement.disableAddress')}
          data-tool="disable"
        >
          <FaPause aria-hidden="true" />
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => onEdit(own)}
        disabled={busy}
        title={t('host.ipAddressTableManagement.editAddress')}
        data-tool="edit"
      >
        <FaPen aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-danger"
        onClick={() => onDelete(own)}
        disabled={busy}
        title={t('host.ipAddressTableManagement.deleteAddress')}
        data-tool="delete"
      >
        <FaTrash aria-hidden="true" />
      </button>
    </>
  );
};

IpAddressRowActions.propTypes = {
  row: PropTypes.shape({ managed: PropTypes.object }).isRequired,
  busy: PropTypes.bool.isRequired,
  onEnable: PropTypes.func.isRequired,
  onDisable: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
