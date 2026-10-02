import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import {
  lacpTone,
  linkStateTone,
  linksArrayOf,
  namedKey,
  policyTone,
} from '../utils/networkingManagement';

import NetworkingDetailsDialog from './NetworkingDetailsDialog';

const valueText = (value, t) => {
  if (value === null || value === undefined || value === '') {
    return t('host.aggregateDetailsModal.notAvailable');
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
};

const stampText = (value, t) =>
  value ? new Date(value).toLocaleString() : t('host.aggregateDetailsModal.notAvailable');

const rowsOf = (entries, t) =>
  entries.map(([key, labelKey, value]) => ({ key, label: t(labelKey), value }));

const basicRows = (aggregate, t) =>
  rowsOf(
    [
      ['name', 'host.aggregateDetailsModal.name', <code key="name">{namedKey(aggregate)}</code>],
      [
        'class',
        'host.aggregateDetailsModal.class',
        <span key="class" className="badge text-bg-info">
          {aggregate.class || 'aggr'}
        </span>,
      ],
      [
        'state',
        'host.aggregateDetailsModal.state',
        <span key="state" className={`badge text-bg-${linkStateTone(aggregate.state)}`}>
          {aggregate.state || t('host.aggregateDetailsModal.unknown')}
        </span>,
      ],
      [
        'policy',
        'host.aggregateDetailsModal.policy',
        <span key="policy" className={`badge text-bg-${policyTone(aggregate.policy)}`}>
          {aggregate.policy || t('host.aggregateDetailsModal.unknown')}
        </span>,
      ],
      [
        'lacp_mode',
        'host.aggregateDetailsModal.lacpMode',
        <span key="lacp" className={`badge text-bg-${lacpTone(aggregate.lacp_mode)}`}>
          {aggregate.lacp_mode || t('host.aggregateDetailsModal.notAvailable')}
        </span>,
      ],
      ['lacp_timer', 'host.aggregateDetailsModal.lacpTimer', valueText(aggregate.lacp_timer, t)],
      ['mtu', 'host.aggregateDetailsModal.mtu', valueText(aggregate.mtu, t)],
      ['speed', 'host.aggregateDetailsModal.speed', valueText(aggregate.speed, t)],
    ],
    t
  );

const linkRows = (links, t) =>
  links.map(link => ({
    key: link,
    label: <code>{link}</code>,
    value: <span className="badge text-bg-success">{t('host.aggregateDetailsModal.active')}</span>,
  }));

const lacpRows = (lacp, t) =>
  rowsOf(
    [
      ['activity', 'host.aggregateDetailsModal.lacpActivity', valueText(lacp.activity, t)],
      ['timeout', 'host.aggregateDetailsModal.lacpTimeout', valueText(lacp.timeout, t)],
      ['aggregation', 'host.aggregateDetailsModal.lacpAggregation', valueText(lacp.aggregation, t)],
      ['sync', 'host.aggregateDetailsModal.lacpSync', valueText(lacp.synchronization, t)],
    ],
    t
  );

const technicalRows = (aggregate, t) =>
  rowsOf(
    [
      [
        'mac',
        'host.aggregateDetailsModal.macAddress',
        <code key="mac">{valueText(aggregate.macaddress, t)}</code>,
      ],
      ['mactype', 'host.aggregateDetailsModal.macAddressType', valueText(aggregate.macaddrtype, t)],
      ['vid', 'host.aggregateDetailsModal.vlanId', valueText(aggregate.vid, t)],
      ['zone', 'host.aggregateDetailsModal.zone', valueText(aggregate.zone, t)],
      ['media', 'host.aggregateDetailsModal.media', valueText(aggregate.media, t)],
      ['duplex', 'host.aggregateDetailsModal.duplex', valueText(aggregate.duplex, t)],
      ['device', 'host.aggregateDetailsModal.device', valueText(aggregate.device, t)],
      ['bridge', 'host.aggregateDetailsModal.bridge', valueText(aggregate.bridge, t)],
      ['pause', 'host.aggregateDetailsModal.pause', valueText(aggregate.pause, t)],
      ['auto', 'host.aggregateDetailsModal.auto', valueText(aggregate.auto, t)],
    ],
    t
  );

const timestampRows = (aggregate, t) =>
  rowsOf(
    [
      ['scan', 'host.aggregateDetailsModal.lastScan', stampText(aggregate.scan_timestamp, t)],
      ['created', 'host.aggregateDetailsModal.created', stampText(aggregate.createdAt, t)],
      ['updated', 'host.aggregateDetailsModal.updated', stampText(aggregate.updatedAt, t)],
    ],
    t
  );

/**
 * The details dialog of one aggregate, hyperweaver-ui's: the basic
 * information, the member links, the LACP state
 * `GET network/aggregates/{name}` answered with `lacp`, the technical
 * details and the timestamps.
 */
const AggregateDetailsModal = ({ aggregate, details, onClose }) => {
  const { t } = useTranslation();
  const links = linksArrayOf(aggregate.links || aggregate.over);
  const sections = [
    {
      key: 'basic',
      title: t('host.aggregateDetailsModal.basicInformation'),
      rows: basicRows(aggregate, t),
    },
    ...(links.length > 0
      ? [
          {
            key: 'links',
            title: t('host.aggregateDetailsModal.memberLinks'),
            rows: linkRows(links, t),
          },
        ]
      : []),
    ...(details?.lacp
      ? [
          {
            key: 'lacp',
            title: t('host.aggregateDetailsModal.lacpDetails'),
            rows: lacpRows(details.lacp, t),
          },
        ]
      : []),
    {
      key: 'technical',
      title: t('host.aggregateDetailsModal.technicalDetails'),
      rows: technicalRows(aggregate, t),
    },
    {
      key: 'timestamps',
      title: t('host.aggregateDetailsModal.timestamps'),
      rows: timestampRows(aggregate, t),
    },
  ];
  return (
    <NetworkingDetailsDialog
      dialog="aggregate-details"
      title={t('host.aggregateDetailsModal.title')}
      sections={sections}
      onClose={onClose}
    />
  );
};

AggregateDetailsModal.propTypes = {
  aggregate: PropTypes.object.isRequired,
  details: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

export default AggregateDetailsModal;
