import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { linkStateTone, vlanTone } from '../utils/networkingManagement';

import NetworkingDetailsDialog from './NetworkingDetailsDialog';

const DEFAULT_MTU = '1500';

const stateBadge = (state, t) => (
  <span className={`badge text-bg-${linkStateTone(state)}`}>
    {state || t('host.vlanDetailsModal.unknown')}
  </span>
);

const vidBadge = (vid, t) => (
  <span className={`badge text-bg-${vlanTone(vid)}`}>
    {vid === undefined || vid === null || vid === '' ? t('host.vlanDetailsModal.noVid') : vid}
  </span>
);

const stamp = value => (value ? new Date(value).toLocaleString() : '');

const basicRows = (vlan, t) => {
  const na = t('host.vlanDetailsModal.notAvailable');
  return [
    { key: 'name', label: t('host.vlanDetailsModal.vlanName'), value: <code>{vlan.link}</code> },
    { key: 'vid', label: t('host.vlanDetailsModal.vlanIdLabel'), value: vidBadge(vlan.vid, t) },
    {
      key: 'over',
      label: t('host.vlanDetailsModal.physicalLink'),
      value: <code>{vlan.over || na}</code>,
    },
    { key: 'state', label: t('host.vlanDetailsModal.state'), value: stateBadge(vlan.state, t) },
    { key: 'class', label: t('host.vlanDetailsModal.class'), value: vlan.class || na },
    { key: 'mtu', label: t('host.vlanDetailsModal.mtu'), value: vlan.mtu || DEFAULT_MTU },
    { key: 'flags', label: t('host.vlanDetailsModal.flags'), value: vlan.flags || na },
  ];
};

const technicalRows = (details, t) =>
  [
    ['link', 'host.vlanDetailsModal.linkName', details.link ? <code>{details.link}</code> : null],
    ['class', 'host.vlanDetailsModal.linkClass', details.class],
    ['vid', 'host.vlanDetailsModal.vlanIdLabel', details.vid],
    ['over', 'host.vlanDetailsModal.overLink', details.over ? <code>{details.over}</code> : null],
    [
      'state',
      'host.vlanDetailsModal.currentState',
      details.state ? stateBadge(details.state, t) : null,
    ],
    ['mtu', 'host.vlanDetailsModal.mtuSize', details.mtu],
    ['flags', 'host.vlanDetailsModal.interfaceFlags', details.flags],
  ]
    .filter(([, , value]) => Boolean(value))
    .map(([key, labelKey, value]) => ({ key, label: t(labelKey), value }));

const metadataRows = (vlan, t) => [
  ...[
    ['scanned', 'host.vlanDetailsModal.lastScanned', stamp(vlan.scan_timestamp)],
    ['created', 'host.vlanDetailsModal.createdAt', stamp(vlan.created_at)],
    ['updated', 'host.vlanDetailsModal.updatedAt', stamp(vlan.updated_at)],
  ]
    .filter(([, , value]) => Boolean(value))
    .map(([key, labelKey, value]) => ({ key, label: t(labelKey), value })),
  {
    key: 'source',
    label: t('host.vlanDetailsModal.dataSource'),
    value: <span className="badge text-bg-info">{vlan.source || 'database'}</span>,
  },
];

/**
 * The details dialog of one VLAN, hyperweaver-ui's: the basic
 * information of the row, the technical details `GET network/vlans/{link}`
 * answered, and the metadata, the timestamps and the source.
 */
const VlanDetailsModal = ({ vlan, details, onClose }) => {
  const { t } = useTranslation();
  const technical = details ? technicalRows(details, t) : [];
  const sections = [
    { key: 'basic', title: t('host.vlanDetailsModal.basicInformation'), rows: basicRows(vlan, t) },
    ...(technical.length > 0
      ? [{ key: 'technical', title: t('host.vlanDetailsModal.technicalDetails'), rows: technical }]
      : []),
    { key: 'metadata', title: t('host.vlanDetailsModal.metadata'), rows: metadataRows(vlan, t) },
  ];
  return (
    <NetworkingDetailsDialog
      dialog="vlan-details"
      title={t('host.vlanDetailsModal.vlanDetailsTitle', { link: vlan.link })}
      sections={sections}
      onClose={onClose}
    />
  );
};

VlanDetailsModal.propTypes = {
  vlan: PropTypes.object.isRequired,
  details: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

export default VlanDetailsModal;
