import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCircleInfo, FaTrash } from 'react-icons/fa6';

import { hasAny } from '../../../components/common/SubTable';
import {
  formatLinkSpeed,
  formatMac,
  linkStateTone,
  shortZoneOf,
  vlanTone,
} from '../utils/networkingManagement';

const badge = (tone, content) => <span className={`badge text-bg-${tone}`}>{content}</span>;

const notAvailable = ctx => ctx.t('host.vnicTable.notAvailable');

const stateWord = (row, ctx) => row.state || ctx.t('host.vnicTable.unknown');

const vlanWord = (row, ctx) =>
  row.vid === undefined || row.vid === null || row.vid === ''
    ? ctx.t('host.vnicTable.noVlan')
    : String(row.vid);

const zoneWord = (row, ctx) => shortZoneOf(row.zone) || ctx.t('host.vnicTable.global');

const speedWord = (row, ctx) => formatLinkSpeed(row.speed) || notAvailable(ctx);

/**
 * The columns of the VNICs table, hyperweaver-ui's: the VNIC, the link
 * it is over, the state, the MAC address with its type under it, the
 * VLAN in the tone of its id, the zone, the speed and the MTU.
 */
export const VNIC_COLUMNS = [
  {
    key: 'link',
    kind: 'name',
    labelKey: 'host.vnicTable.vnic',
    value: row => row.link || '',
    render: row => <strong className="font-monospace">{row.link}</strong>,
  },
  {
    key: 'over',
    kind: 'text',
    labelKey: 'host.vnicTable.physicalLink',
    priority: 2,
    value: (row, ctx) => row.over || notAvailable(ctx),
    render: (row, ctx) => <code>{row.over || notAvailable(ctx)}</code>,
  },
  {
    key: 'state',
    kind: 'badge',
    labelKey: 'host.vnicTable.state',
    value: stateWord,
    render: (row, ctx) => badge(linkStateTone(row.state), stateWord(row, ctx)),
  },
  {
    key: 'macaddress',
    kind: 'text',
    labelKey: 'host.vnicTable.macAddress',
    priority: 5,
    value: row => formatMac(row.macaddress),
    render: (row, ctx) => (
      <span>
        <code>{formatMac(row.macaddress) || notAvailable(ctx)}</code>
        {row.macaddrtype ? <div className="small text-muted">{row.macaddrtype}</div> : null}
      </span>
    ),
  },
  {
    key: 'vid',
    kind: 'badge',
    labelKey: 'host.vnicTable.vlan',
    priority: 4,
    value: row => Number(row.vid) || 0,
    render: (row, ctx) => badge(vlanTone(row.vid), vlanWord(row, ctx)),
  },
  {
    key: 'zone',
    kind: 'text',
    labelKey: 'host.vnicTable.zone',
    priority: 3,
    value: zoneWord,
    render: (row, ctx) => (
      <span className="small" title={row.zone}>
        {zoneWord(row, ctx)}
      </span>
    ),
  },
  {
    key: 'speed',
    kind: 'badge',
    labelKey: 'host.vnicTable.speed',
    priority: 6,
    when: hasAny(row => row.speed),
    value: row => Number(row.speed) || 0,
    render: (row, ctx) => badge('info', speedWord(row, ctx)),
  },
  {
    key: 'mtu',
    kind: 'count',
    labelKey: 'host.vnicTable.mtu',
    priority: 6,
    when: hasAny(row => row.mtu),
    value: row => Number(row.mtu) || 0,
    render: (row, ctx) => row.mtu || notAvailable(ctx),
  },
];

/**
 * The actions of one VNIC, hyperweaver-ui's: the details and, for a role
 * that controls hosts, the delete, each held while a request is in
 * flight.
 */
export const VnicRowActions = ({ row, busy, canEdit, onDetails, onDelete }) => {
  const { t } = useTranslation();
  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        onClick={() => onDetails(row)}
        disabled={busy}
        title={t('host.vnicTable.viewDetails')}
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
          title={t('host.vnicTable.deleteVnic')}
          data-tool="delete"
        >
          <FaTrash aria-hidden="true" />
        </button>
      ) : null}
    </>
  );
};

VnicRowActions.propTypes = {
  row: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  canEdit: PropTypes.bool.isRequired,
  onDetails: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
