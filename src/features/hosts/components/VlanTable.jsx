import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCircleInfo, FaTrash } from 'react-icons/fa6';

import { hasAny } from '../../../components/common/SubTable';
import { linkStateTone, vlanTone } from '../utils/networkingManagement';

const DEFAULT_MTU = '1500';

const badge = (tone, content) => <span className={`badge text-bg-${tone}`}>{content}</span>;

const stateWord = (row, ctx) => row.state || ctx.t('host.vlanTable.unknown');

const vlanWord = (row, ctx) =>
  row.vid === undefined || row.vid === null || row.vid === ''
    ? ctx.t('host.vlanTable.noVid')
    : String(row.vid);

/**
 * The columns of the VLANs table, hyperweaver-ui's: the VLAN, its id in
 * the tone of the id, the link it is over, the state, the MTU and the
 * flags.
 */
export const VLAN_COLUMNS = [
  {
    key: 'link',
    kind: 'name',
    labelKey: 'host.vlanTable.vlanName',
    value: row => row.link || '',
    render: row => <strong className="font-monospace">{row.link}</strong>,
  },
  {
    key: 'vid',
    kind: 'badge',
    labelKey: 'host.vlanTable.vlanId',
    value: row => Number(row.vid) || 0,
    render: (row, ctx) => badge(vlanTone(row.vid), vlanWord(row, ctx)),
  },
  {
    key: 'over',
    kind: 'text',
    labelKey: 'host.vlanTable.physicalLink',
    priority: 2,
    value: row => row.over || '',
    render: row => <code>{row.over || 'N/A'}</code>,
  },
  {
    key: 'state',
    kind: 'badge',
    labelKey: 'host.vlanTable.state',
    value: stateWord,
    render: (row, ctx) => badge(linkStateTone(row.state), stateWord(row, ctx)),
  },
  {
    key: 'mtu',
    kind: 'count',
    labelKey: 'host.vlanTable.mtu',
    priority: 4,
    value: row => Number(row.mtu) || Number(DEFAULT_MTU),
    render: row => row.mtu || DEFAULT_MTU,
  },
  {
    key: 'flags',
    kind: 'text',
    labelKey: 'host.vlanTable.flags',
    priority: 5,
    when: hasAny(row => row.flags),
    value: row => row.flags || '',
    render: row => <span className="text-muted">{row.flags || '-'}</span>,
  },
];

/**
 * The actions of one VLAN, hyperweaver-ui's: the details and the delete.
 */
export const VlanRowActions = ({ row, busy, onDetails, onDelete }) => {
  const { t } = useTranslation();
  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        onClick={() => onDetails(row)}
        disabled={busy}
        title={t('host.vlanTable.viewDetails')}
        data-tool="details"
      >
        <FaCircleInfo aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-danger"
        onClick={() => onDelete(row)}
        disabled={busy}
        title={t('host.vlanTable.deleteVlan')}
        data-tool="delete"
      >
        <FaTrash aria-hidden="true" />
      </button>
    </>
  );
};

VlanRowActions.propTypes = {
  row: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onDetails: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
