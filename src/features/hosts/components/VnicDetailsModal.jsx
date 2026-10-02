import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { formatMac, linkStateTone } from '../utils/networkingManagement';

import NetworkingDetailsDialog from './NetworkingDetailsDialog';

const NO_LINK = '--';

const speedText = (speed, t) => {
  const megabits = Number(speed);
  if (!megabits) {
    return t('host.vnicDetailsModal.notAvailable');
  }
  return megabits >= 1000 ? `${megabits / 1000} Gbps` : `${megabits} Mbps`;
};

const labelOf = key => key.replace(/_/gu, ' ').replace(/\b\w/gu, letter => letter.toUpperCase());

const detailRows = details =>
  Object.entries(details || {}).map(([key, value]) => ({
    key,
    label: labelOf(key),
    value:
      typeof value === 'object' ? (
        <pre className="small task-metadata mb-0">{JSON.stringify(value, null, 2)}</pre>
      ) : (
        <code>{String(value)}</code>
      ),
  }));

const basicRows = (vnic, t) => {
  const na = t('host.vnicDetailsModal.notAvailable');
  const optional = [
    ['device', 'host.vnicDetailsModal.device', vnic.device],
    ['bridge', 'host.vnicDetailsModal.bridge', vnic.bridge !== NO_LINK ? vnic.bridge : ''],
    ['pause', 'host.vnicDetailsModal.pause', vnic.pause],
    ['auto', 'host.vnicDetailsModal.autoNegotiation', vnic.auto],
  ]
    .filter(([, , value]) => Boolean(value))
    .map(([key, labelKey, value]) => ({ key, label: t(labelKey), value }));
  return [
    { key: 'name', label: t('host.vnicDetailsModal.vnicName'), value: <code>{vnic.link}</code> },
    {
      key: 'over',
      label: t('host.vnicDetailsModal.physicalLink'),
      value: <code>{vnic.over || na}</code>,
    },
    {
      key: 'state',
      label: t('host.vnicDetailsModal.state'),
      value: (
        <span className={`badge text-bg-${linkStateTone(vnic.state)}`}>
          {vnic.state || t('host.vnicDetailsModal.unknown')}
        </span>
      ),
    },
    {
      key: 'mac',
      label: t('host.vnicDetailsModal.macAddress'),
      value: <code>{formatMac(vnic.macaddress) || na}</code>,
    },
    {
      key: 'mactype',
      label: t('host.vnicDetailsModal.macAddressType'),
      value: vnic.macaddrtype || na,
    },
    {
      key: 'vid',
      label: t('host.vnicDetailsModal.vlanId'),
      value: (
        <span className="badge text-bg-secondary">
          {vnic.vid === undefined ? na : String(vnic.vid)}
        </span>
      ),
    },
    {
      key: 'zone',
      label: t('host.vnicDetailsModal.zoneAssignment'),
      value: (
        <code>
          {vnic.zone && vnic.zone !== NO_LINK ? vnic.zone : t('host.vnicDetailsModal.globalZone')}
        </code>
      ),
    },
    { key: 'speed', label: t('host.vnicDetailsModal.speed'), value: speedText(vnic.speed, t) },
    { key: 'mtu', label: t('host.vnicDetailsModal.mtu'), value: vnic.mtu || na },
    { key: 'media', label: t('host.vnicDetailsModal.mediaType'), value: vnic.media || na },
    { key: 'duplex', label: t('host.vnicDetailsModal.duplex'), value: vnic.duplex || na },
    ...optional,
  ];
};

const timestampRows = (vnic, t) =>
  [
    ['created', 'host.vnicDetailsModal.created', vnic.created_at],
    ['updated', 'host.vnicDetailsModal.lastUpdated', vnic.updated_at],
  ]
    .filter(([, , value]) => Boolean(value))
    .map(([key, labelKey, value]) => ({
      key,
      label: t(labelKey),
      value: new Date(value).toLocaleString(),
    }));

/**
 * The details dialog of one VNIC, hyperweaver-ui's: the basic
 * information of the row, the additional details `GET network/vnics/{link}`
 * answered, one row a member, and the timestamps where the row carries
 * them.
 */
const VnicDetailsModal = ({ vnic, details, onClose }) => {
  const { t } = useTranslation();
  const extra = detailRows(details);
  const stamps = timestampRows(vnic, t);
  const sections = [
    { key: 'basic', title: t('host.vnicDetailsModal.basicInformation'), rows: basicRows(vnic, t) },
    extra.length > 0
      ? { key: 'details', title: t('host.vnicDetailsModal.additionalDetails'), rows: extra }
      : {
          key: 'details',
          title: t('host.vnicDetailsModal.additionalDetails'),
          raw: t('host.vnicDetailsModal.noAdditionalDetails'),
        },
    ...(stamps.length > 0
      ? [{ key: 'timestamps', title: t('host.vnicDetailsModal.timestamps'), rows: stamps }]
      : []),
  ];
  return (
    <NetworkingDetailsDialog
      dialog="vnic-details"
      title={t('host.vnicDetailsModal.vnicDetails')}
      sections={sections}
      onClose={onClose}
    />
  );
};

VnicDetailsModal.propTypes = {
  vnic: PropTypes.object.isRequired,
  details: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

export default VnicDetailsModal;
