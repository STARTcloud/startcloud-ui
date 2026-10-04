import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCircleInfo, FaTrash } from 'react-icons/fa6';

import { linkStateTone, namedKey } from '../utils/networkingManagement';

const badge = (tone, content) => <span className={`badge text-bg-${tone}`}>{content}</span>;

const vnicCount = row => (Array.isArray(row.vnics) ? row.vnics.length : 0);

/**
 * The columns of the etherstubs table, hyperweaver-ui's: the name, the
 * class, the state, the link it is over and the count of its VNICs.
 */
export const ETHERSTUB_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'host.etherstubTable.name',
    value: namedKey,
    render: row => <strong className="font-monospace">{namedKey(row)}</strong>,
  },
  {
    key: 'class',
    kind: 'badge',
    labelKey: 'host.etherstubTable.class',
    priority: 3,
    value: (row, ctx) => row.class || ctx.t('host.etherstubTable.defaultClass'),
    render: (row, ctx) => badge('info', row.class || ctx.t('host.etherstubTable.defaultClass')),
  },
  {
    key: 'state',
    kind: 'badge',
    labelKey: 'host.etherstubTable.state',
    value: row => row.state || 'up',
    render: row => badge(linkStateTone(row.state || 'up'), row.state || 'up'),
  },
  {
    key: 'over',
    kind: 'text',
    labelKey: 'host.etherstubTable.over',
    priority: 4,
    value: row => row.over || '',
    render: row => row.over || '--',
  },
  {
    key: 'vnics',
    kind: 'count',
    labelKey: 'host.etherstubTable.vnics',
    priority: 2,
    value: vnicCount,
    render: (row, ctx) => ctx.t('host.etherstubTable.vnicCount', { count: vnicCount(row) }),
  },
];

/**
 * The actions of one etherstub, hyperweaver-ui's: the details and, for
 * a role that controls hosts, the delete.
 */
export const EtherstubRowActions = ({ row, busy, canEdit, onDetails, onDelete }) => {
  const { t } = useTranslation();
  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        onClick={() => onDetails(row)}
        disabled={busy}
        title={t('host.etherstubTable.viewDetails')}
        data-tool="details"
      >
        <FaCircleInfo aria-hidden="true" />
      </button>
      {canEdit ? (
        <button
          type="button"
          className="btn btn-sm btn-danger"
          onClick={() => onDelete(row)}
          disabled={busy}
          title={t('host.etherstubTable.deleteEtherstub')}
          data-tool="delete"
        >
          <FaTrash aria-hidden="true" />
        </button>
      ) : null}
    </>
  );
};

EtherstubRowActions.propTypes = {
  row: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  canEdit: PropTypes.bool.isRequired,
  onDetails: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
