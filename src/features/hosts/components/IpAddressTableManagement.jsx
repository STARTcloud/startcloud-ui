import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaPause, FaPlay, FaTrash } from 'react-icons/fa6';

import {
  addressStateTone,
  addressTypeTone,
  canDisableAddress,
  canEnableAddress,
  managedAddressOf,
} from '../utils/networkingManagement';

const badge = (tone, content) => <span className={`badge text-bg-${tone}`}>{content}</span>;

const typeWord = (row, ctx) => {
  if (String(row.type || '').toLowerCase() === 'addrconf') {
    return ctx.t('host.ipAddressTableManagement.auto');
  }
  return row.type || ctx.t('host.ipAddressTableManagement.unknown');
};

const versionWord = (row, ctx) => {
  const version = String(row.ip_version || '').toLowerCase();
  if (version === 'v4') {
    return ctx.t('host.ipAddressTableManagement.ipv4');
  }
  if (version === 'v6') {
    return ctx.t('host.ipAddressTableManagement.ipv6');
  }
  return row.ip_version || ctx.t('host.ipAddressTableManagement.unknown');
};

const versionTone = row => (String(row.ip_version || '').toLowerCase() === 'v6' ? 'dark' : 'info');

const stateWord = (row, ctx) => row.state || ctx.t('host.ipAddressTableManagement.unknown');

const addressWord = (row, ctx) =>
  managedAddressOf(row) || ctx.t('host.ipAddressTableManagement.na');

/**
 * The columns of the managed addresses table, hyperweaver-ui's: the
 * interface, the address object, the address, the type, the version and
 * the state, each badge in the tone hyperweaver-ui gave it.
 */
export const MANAGED_ADDRESS_COLUMNS = [
  {
    key: 'interface',
    kind: 'name',
    labelKey: 'host.ipAddressTableManagement.interface',
    value: row => row.interface || '',
    render: row => <strong className="font-monospace">{row.interface}</strong>,
  },
  {
    key: 'addrobj',
    kind: 'text',
    labelKey: 'host.ipAddressTableManagement.addressObject',
    priority: 3,
    value: row => row.addrobj || '',
    render: row => <code>{row.addrobj}</code>,
  },
  {
    key: 'address',
    kind: 'text',
    labelKey: 'host.ipAddressTableManagement.ipAddress',
    priority: 2,
    value: addressWord,
    render: (row, ctx) => <code>{addressWord(row, ctx)}</code>,
  },
  {
    key: 'type',
    kind: 'badge',
    labelKey: 'host.ipAddressTableManagement.type',
    priority: 4,
    value: typeWord,
    render: (row, ctx) => badge(addressTypeTone(row.type), typeWord(row, ctx)),
  },
  {
    key: 'version',
    kind: 'badge',
    labelKey: 'host.ipAddressTableManagement.version',
    priority: 5,
    value: versionWord,
    render: (row, ctx) => badge(versionTone(row), versionWord(row, ctx)),
  },
  {
    key: 'state',
    kind: 'badge',
    labelKey: 'host.ipAddressTableManagement.state',
    value: stateWord,
    render: (row, ctx) => badge(addressStateTone(row.state), stateWord(row, ctx)),
  },
];

/**
 * The actions of one managed address, hyperweaver-ui's: Enable while the
 * address reads disabled, Disable while it reads ok, and Delete always,
 * every button held while a request is in flight.
 */
export const IpAddressRowActions = ({ row, busy, onEnable, onDisable, onDelete }) => {
  const { t } = useTranslation();
  return (
    <>
      {canEnableAddress(row) ? (
        <button
          type="button"
          className="btn btn-sm btn-success"
          onClick={() => onEnable(row)}
          disabled={busy}
          title={t('host.ipAddressTableManagement.enableAddress')}
          data-tool="enable"
        >
          <FaPlay aria-hidden="true" />
        </button>
      ) : null}
      {canDisableAddress(row) ? (
        <button
          type="button"
          className="btn btn-sm btn-warning"
          onClick={() => onDisable(row)}
          disabled={busy}
          title={t('host.ipAddressTableManagement.disableAddress')}
          data-tool="disable"
        >
          <FaPause aria-hidden="true" />
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn-sm btn-danger"
        onClick={() => onDelete(row)}
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
  row: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onEnable: PropTypes.func.isRequired,
  onDisable: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
