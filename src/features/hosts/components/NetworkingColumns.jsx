import { FaArrowDown, FaArrowUp, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import { hasAny } from '../../../components/common/SubTable';
import {
  addressOf,
  addressTone,
  bandwidthOf,
  bandwidthTone,
  carries,
  classTone,
  formatBandwidth,
  formatSpeed,
  intervalOf,
  packetsOf,
  prefixOf,
  zoneOf,
} from '../utils/networking';

const INTERVAL_DIGITS = 1;

const SECONDS_UNIT = 's';

const machinePath = (id, name) => `/hosts/${id}/machines/${encodeURIComponent(name)}`;

const notAvailable = ctx => ctx.t('hosts.overview.notAvailable');

const badge = (tone, content) => <span className={`badge text-bg-${tone}`}>{content}</span>;

const code = text => (text ? <code>{text}</code> : null);

const textOr = (value, ctx) => value || notAvailable(ctx);

const prefixWord = (row, ctx) => prefixOf(row) || ctx.t('host.ipAddressTable.na');

const versionWord = (row, ctx) => row.ip_version || ctx.t('host.ipAddressTable.ipv4');

const addressState = (row, ctx) => row.state || ctx.t('host.ipAddressTable.active');

/**
 * The columns of the addresses table, hyperweaver-ui's: the interface,
 * the address, the prefix, the version and the state in its tone. The
 * address and the prefix are read as the row's backend answers them,
 * `ip_address` and `prefix_length` where a row carries them and the two
 * parts of `addr` otherwise, each column drawn only while a row carries
 * its value; a cell a row has no value for reads hyperweaver-ui's word.
 */
export const ADDRESS_COLUMNS = [
  {
    key: 'interface',
    kind: 'name',
    labelKey: 'host.ipAddressTable.interface',
    value: row => row.interface || '',
    render: row => <strong>{row.interface}</strong>,
  },
  {
    key: 'address',
    kind: 'text',
    labelKey: 'host.ipAddressTable.ipAddress',
    priority: 2,
    when: hasAny(addressOf),
    value: addressOf,
    render: row => code(addressOf(row)),
  },
  {
    key: 'prefix',
    kind: 'text',
    labelKey: 'host.ipAddressTable.netmaskPrefix',
    priority: 4,
    when: hasAny(prefixOf),
    value: prefixOf,
    render: (row, ctx) => code(prefixWord(row, ctx)),
  },
  {
    key: 'version',
    kind: 'badge',
    labelKey: 'host.ipAddressTable.type',
    priority: 3,
    value: versionWord,
    render: (row, ctx) => badge('info', versionWord(row, ctx)),
  },
  {
    key: 'state',
    kind: 'badge',
    labelKey: 'host.ipAddressTable.status',
    value: addressState,
    render: (row, ctx) => badge(addressTone(row.state), addressState(row, ctx)),
  },
];

const routeWord = (value, ctx) => value || ctx.t('host.routingTable.notAvailable');

const defaultWord = (row, ctx) => ctx.t(row.is_default ? 'yes' : 'no');

/**
 * The columns of the routing table: hyperweaver-ui's interface,
 * destination and gateway, its not available word for a member a route
 * does not carry, and after them the members a route really carries, the
 * mask of its destination, its version, whether it is the default route
 * and its flags, each drawn only while a row carries its value, and last
 * hyperweaver-ui's Metric and Type, the one word each draws for every
 * route until a backend answers them.
 */
export const ROUTE_COLUMNS = [
  {
    key: 'interface',
    kind: 'name',
    labelKey: 'host.routingTable.interface',
    value: (row, ctx) => routeWord(row.interface, ctx),
    render: (row, ctx) => <strong>{routeWord(row.interface, ctx)}</strong>,
  },
  {
    key: 'destination',
    kind: 'text',
    labelKey: 'host.routingTable.destination',
    priority: 2,
    value: (row, ctx) => routeWord(row.destination, ctx),
    render: (row, ctx) => code(routeWord(row.destination, ctx)),
  },
  {
    key: 'gateway',
    kind: 'text',
    labelKey: 'host.routingTable.gateway',
    priority: 3,
    value: (row, ctx) => routeWord(row.gateway, ctx),
    render: (row, ctx) => code(routeWord(row.gateway, ctx)),
  },
  {
    key: 'mask',
    kind: 'text',
    labelKey: 'hosts.networking.routes.mask',
    priority: 6,
    when: hasAny(row => row.destination_mask),
    value: row => row.destination_mask || '',
    render: row => code(row.destination_mask),
  },
  {
    key: 'version',
    kind: 'badge',
    labelKey: 'hosts.networking.routes.version',
    priority: 5,
    when: hasAny(row => row.ip_version),
    value: row => row.ip_version || '',
    render: row => (row.ip_version ? badge('info', row.ip_version) : null),
  },
  {
    key: 'default',
    kind: 'word',
    labelKey: 'hosts.networking.routes.default',
    priority: 4,
    when: carries('is_default'),
    value: defaultWord,
  },
  {
    key: 'flags',
    kind: 'text',
    labelKey: 'hosts.networking.routes.flags',
    priority: 7,
    when: hasAny(row => row.flags),
    value: row => row.flags || '',
    render: row => code(row.flags),
  },
  {
    key: 'metric',
    kind: 'text',
    labelKey: 'host.routingTable.metric',
    priority: 8,
    value: (row, ctx) => routeWord(row.metric, ctx),
  },
  {
    key: 'type',
    kind: 'badge',
    labelKey: 'host.routingTable.type',
    priority: 8,
    value: (row, ctx) => row.type || ctx.t('host.routingTable.static'),
    render: (row, ctx) => badge('dark', row.type || ctx.t('host.routingTable.static')),
  },
];

const stateWord = (row, ctx) => row.state || ctx.t('hosts.overview.unknown');

const zoneCell = ({ row, ctx, id, machines }) => {
  const zone = zoneOf(row);
  if (!zone) {
    return <span className="text-muted">{ctx.t('host.interfacesTable.global')}</span>;
  }
  if (!machines) {
    return <span data-zone="plain">{zone}</span>;
  }
  return (
    <Link
      to={machinePath(id, zone)}
      className="btn btn-sm btn-warning py-1 px-2 small"
      title={ctx.t('host.interfacesTable.goToZone', { zone })}
      data-link="zone"
    >
      <FaArrowUpRightFromSquare className="me-2" aria-hidden="true" />
      {zone}
    </Link>
  );
};

/**
 * The columns of the interfaces table, hyperweaver-ui's: the link, the
 * class and the state in their tones, the speed, the MTU, the MAC
 * address, the VLAN and the zone, every column after the state drawn
 * only while a row carries its value, because each backend answers the
 * row its platform has. The zone of an interface is hyperweaver-ui's
 * button to the machine of that name on a host whose own row lists
 * `machines`, and plain text on a host that does not.
 *
 * @param {Object} options - The host's side
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {boolean} options.machines - Whether the host's own row lists `machines`
 * @returns {Array<Object>} The columns
 */
export const interfaceColumnsFor = ({ id, machines }) => [
  {
    key: 'link',
    kind: 'name',
    labelKey: 'host.interfacesTable.link',
    titleKey: 'host.interfacesTable.sortByLink',
    value: row => row.link,
    render: row => <strong>{row.link}</strong>,
  },
  {
    key: 'class',
    kind: 'badge',
    labelKey: 'host.interfacesTable.class',
    titleKey: 'host.interfacesTable.sortByClass',
    priority: 3,
    value: row => row.class || '',
    render: row => (row.class ? badge(classTone(row.class), row.class) : null),
  },
  {
    key: 'state',
    kind: 'badge',
    labelKey: 'host.interfacesTable.state',
    titleKey: 'host.interfacesTable.sortByState',
    value: stateWord,
    render: (row, ctx) => badge(row.state === 'up' ? 'success' : 'danger', stateWord(row, ctx)),
  },
  {
    key: 'speed',
    kind: 'text',
    labelKey: 'host.interfacesTable.speed',
    titleKey: 'host.interfacesTable.sortBySpeed',
    priority: 4,
    when: hasAny(row => formatSpeed(row.speed)),
    value: row => Number(row.speed) || 0,
    render: (row, ctx) => textOr(formatSpeed(row.speed), ctx),
  },
  {
    key: 'mtu',
    kind: 'count',
    labelKey: 'host.interfacesTable.mtu',
    titleKey: 'host.interfacesTable.sortByMtu',
    priority: 5,
    when: hasAny(row => row.mtu),
    value: row => Number(row.mtu) || 0,
    render: (row, ctx) => textOr(row.mtu, ctx),
  },
  {
    key: 'macaddress',
    kind: 'text',
    labelKey: 'host.interfacesTable.macAddress',
    titleKey: 'host.interfacesTable.sortByMac',
    priority: 6,
    when: hasAny(row => row.macaddress),
    value: row => row.macaddress || '',
    render: (row, ctx) => code(textOr(row.macaddress, ctx)),
  },
  {
    key: 'vid',
    kind: 'text',
    labelKey: 'host.interfacesTable.vlan',
    titleKey: 'host.interfacesTable.sortByVlan',
    priority: 7,
    when: hasAny(row => row.vid),
    value: row => Number(row.vid) || 0,
    render: (row, ctx) => textOr(row.vid, ctx),
  },
  {
    key: 'zone',
    kind: 'link',
    labelKey: 'host.interfacesTable.zone',
    titleKey: 'host.interfacesTable.sortByZone',
    priority: 2,
    when: hasAny(zoneOf),
    value: zoneOf,
    render: (row, ctx) => zoneCell({ row, ctx, id, machines }),
  },
];

const rateBadge = (tone, Glyph, rate) => (
  <span className={`badge text-bg-${tone}`}>
    <Glyph className="me-1" aria-hidden="true" />
    {formatBandwidth(rate)}
  </span>
);

const intervalText = (row, ctx) => {
  const seconds = intervalOf(row);
  return seconds > 0
    ? `${seconds.toFixed(INTERVAL_DIGITS)}${SECONDS_UNIT}`
    : ctx.t('host.bandwidthTable.notAvailable');
};

const packets = (row, member, ctx) => packetsOf(row, member).toLocaleString(ctx.language);

/**
 * The columns of the bandwidth table, hyperweaver-ui's: the interface,
 * the rate both ways in the tone of its size, the rate received and the
 * rate sent, the seconds the sample spans and the packets received and
 * sent in them, the packets drawn only while a sample carries the
 * deltas.
 */
export const BANDWIDTH_COLUMNS = [
  {
    key: 'link',
    kind: 'name',
    labelKey: 'host.bandwidthTable.interface',
    titleKey: 'host.bandwidthTable.sortByInterface',
    value: row => row.link,
    render: row => <strong>{row.link}</strong>,
  },
  {
    key: 'total',
    kind: 'badge',
    labelKey: 'host.bandwidthTable.totalBandwidth',
    titleKey: 'host.bandwidthTable.sortByTotal',
    value: row => bandwidthOf(row).total,
    render: row => {
      const { total } = bandwidthOf(row);
      return badge(bandwidthTone(total), formatBandwidth(total));
    },
  },
  {
    key: 'rx',
    kind: 'badge',
    labelKey: 'host.bandwidthTable.rxRate',
    titleKey: 'host.bandwidthTable.sortByRx',
    priority: 3,
    value: row => bandwidthOf(row).rx,
    render: row => rateBadge('info', FaArrowDown, bandwidthOf(row).rx),
  },
  {
    key: 'tx',
    kind: 'badge',
    labelKey: 'host.bandwidthTable.txRate',
    titleKey: 'host.bandwidthTable.sortByTx',
    priority: 3,
    value: row => bandwidthOf(row).tx,
    render: row => rateBadge('warning', FaArrowUp, bandwidthOf(row).tx),
  },
  {
    key: 'interval',
    kind: 'text',
    labelKey: 'host.bandwidthTable.interval',
    titleKey: 'host.bandwidthTable.sortByInterval',
    priority: 6,
    value: intervalOf,
    render: intervalText,
  },
  {
    key: 'rxPackets',
    kind: 'count',
    labelKey: 'host.bandwidthTable.rxPackets',
    titleKey: 'host.bandwidthTable.sortByRxPackets',
    priority: 4,
    when: carries('ipackets_delta'),
    value: row => packetsOf(row, 'ipackets_delta'),
    render: (row, ctx) => <span className="text-info">{packets(row, 'ipackets_delta', ctx)}</span>,
  },
  {
    key: 'txPackets',
    kind: 'count',
    labelKey: 'host.bandwidthTable.txPackets',
    titleKey: 'host.bandwidthTable.sortByTxPackets',
    priority: 4,
    when: carries('opackets_delta'),
    value: row => packetsOf(row, 'opackets_delta'),
    render: (row, ctx) => (
      <span className="text-warning">{packets(row, 'opackets_delta', ctx)}</span>
    ),
  },
];
