import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { linkStateTone, namedKey } from '../utils/networkingManagement';

import NetworkingDetailsDialog from './NetworkingDetailsDialog';

const valueText = (value, t) => {
  if (value === null || value === undefined || value === '') {
    return t('host.etherstubDetailsModal.na');
  }
  if (typeof value === 'boolean') {
    return value ? t('host.etherstubDetailsModal.yes') : t('host.etherstubDetailsModal.no');
  }
  return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
};

const stateBadge = (state, t) => (
  <span className={`badge text-bg-${linkStateTone(state)}`}>
    {state || t('host.etherstubDetailsModal.unknown')}
  </span>
);

const stampText = (value, t) =>
  value ? new Date(value).toLocaleString() : t('host.etherstubDetailsModal.na');

const rowsOf = (entries, t) =>
  entries.map(([key, labelKey, value]) => ({ key, label: t(labelKey), value }));

const basicRows = (etherstub, t) =>
  rowsOf(
    [
      ['name', 'host.etherstubDetailsModal.name', <code key="name">{namedKey(etherstub)}</code>],
      [
        'class',
        'host.etherstubDetailsModal.class',
        <span key="class" className="badge text-bg-info">
          {etherstub.class || t('host.etherstubDetailsModal.defaultClass')}
        </span>,
      ],
      ['state', 'host.etherstubDetailsModal.state', stateBadge(etherstub.state, t)],
      ['mtu', 'host.etherstubDetailsModal.mtu', valueText(etherstub.mtu, t)],
      ['over', 'host.etherstubDetailsModal.over', valueText(etherstub.over, t)],
      ['zone', 'host.etherstubDetailsModal.zone', valueText(etherstub.zone, t)],
    ],
    t
  );

const vnicRows = (vnics, t) =>
  vnics.map(vnic => ({
    key: vnic.link || vnic.name,
    label: <code>{vnic.link || vnic.name}</code>,
    value: (
      <span className="d-inline-flex align-items-center gap-2">
        <span>{valueText(vnic.over, t)}</span>
        {stateBadge(vnic.state, t)}
        <span>{valueText(vnic.zone, t)}</span>
      </span>
    ),
  }));

const technicalRows = (etherstub, t) =>
  rowsOf(
    [
      [
        'mac',
        'host.etherstubDetailsModal.macAddress',
        <code key="mac">{valueText(etherstub.macaddress, t)}</code>,
      ],
      ['mactype', 'host.etherstubDetailsModal.macAddressType', valueText(etherstub.macaddrtype, t)],
      ['vid', 'host.etherstubDetailsModal.vlanId', valueText(etherstub.vid, t)],
      ['speed', 'host.etherstubDetailsModal.speed', valueText(etherstub.speed, t)],
      ['media', 'host.etherstubDetailsModal.media', valueText(etherstub.media, t)],
      ['duplex', 'host.etherstubDetailsModal.duplex', valueText(etherstub.duplex, t)],
      ['device', 'host.etherstubDetailsModal.device', valueText(etherstub.device, t)],
      ['bridge', 'host.etherstubDetailsModal.bridge', valueText(etherstub.bridge, t)],
      ['pause', 'host.etherstubDetailsModal.pause', valueText(etherstub.pause, t)],
      ['auto', 'host.etherstubDetailsModal.auto', valueText(etherstub.auto, t)],
    ],
    t
  );

const timestampRows = (etherstub, t) =>
  rowsOf(
    [
      ['scan', 'host.etherstubDetailsModal.lastScan', stampText(etherstub.scan_timestamp, t)],
      ['created', 'host.etherstubDetailsModal.created', stampText(etherstub.createdAt, t)],
      ['updated', 'host.etherstubDetailsModal.updated', stampText(etherstub.updatedAt, t)],
    ],
    t
  );

/**
 * The details dialog of one etherstub, hyperweaver-ui's: the basic
 * information, the VNICs `GET network/etherstubs/{name}` answered with
 * `show_vnics`, the technical details and the timestamps.
 */
const EtherstubDetailsModal = ({ etherstub, details, onClose }) => {
  const { t } = useTranslation();
  const vnics = Array.isArray(details?.vnics) ? details.vnics : [];
  const sections = [
    {
      key: 'basic',
      title: t('host.etherstubDetailsModal.basicInfo'),
      rows: basicRows(etherstub, t),
    },
    ...(vnics.length > 0
      ? [
          {
            key: 'vnics',
            title: t('host.etherstubDetailsModal.associatedVnics'),
            rows: vnicRows(vnics, t),
          },
        ]
      : []),
    {
      key: 'technical',
      title: t('host.etherstubDetailsModal.technicalDetails'),
      rows: technicalRows(etherstub, t),
    },
    {
      key: 'timestamps',
      title: t('host.etherstubDetailsModal.timestamps'),
      rows: timestampRows(etherstub, t),
    },
  ];
  return (
    <NetworkingDetailsDialog
      dialog="etherstub-details"
      title={t('host.etherstubDetailsModal.title')}
      sections={sections}
      onClose={onClose}
    />
  );
};

EtherstubDetailsModal.propTypes = {
  etherstub: PropTypes.object.isRequired,
  details: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

export default EtherstubDetailsModal;
