import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCircleInfo, FaRotate } from 'react-icons/fa6';

import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import { detailSearchShape } from '../../../utils/itemShape';
import {
  categoryTone,
  deviceKey,
  deviceState,
  deviceStateTone,
  pptState,
  pptStateTone,
} from '../utils/DeviceUtils';

const badge = (tone, content) => <span className={`badge text-bg-${tone}`}>{content}</span>;

const zonesOf = device => device.assigned_to_zones || [];

const ZonesCell = ({ device, ctx }) => {
  const zones = zonesOf(device);
  if (zones.length === 0) {
    return <span className="text-muted">{ctx.t('host.deviceInventoryTable.none')}</span>;
  }
  return (
    <span className="d-inline-flex flex-wrap gap-1">
      {zones.map(zone => (
        <span key={zone} className="badge text-bg-warning">
          {zone}
        </span>
      ))}
    </span>
  );
};

ZonesCell.propTypes = {
  device: PropTypes.object.isRequired,
  ctx: PropTypes.object.isRequired,
};

/**
 * The columns of the devices table, hyperweaver-ui's: the name, the
 * vendor, the PCI address, the category in its tone, the driver, the
 * state, the passthrough state and the zones the device is assigned to.
 */
export const DEVICE_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'host.deviceInventoryTable.nameHeader',
    titleKey: 'host.deviceInventoryTable.sortNameTitle',
    value: (device, ctx) => device.device_name || ctx.t('host.deviceInventoryTable.unknownDevice'),
    render: (device, ctx) => (
      <strong>{device.device_name || ctx.t('host.deviceInventoryTable.unknownDevice')}</strong>
    ),
  },
  {
    key: 'vendor',
    kind: 'text',
    labelKey: 'host.deviceInventoryTable.vendorHeader',
    titleKey: 'host.deviceInventoryTable.sortVendorTitle',
    priority: 4,
    value: (device, ctx) => device.vendor_name || ctx.t('host.deviceInventoryTable.unknown'),
  },
  {
    key: 'pci',
    kind: 'text',
    labelKey: 'host.deviceInventoryTable.pciAddressHeader',
    titleKey: 'host.deviceInventoryTable.sortPciAddressTitle',
    priority: 1,
    value: (device, ctx) => device.pci_address || ctx.t('host.deviceInventoryTable.notAvailable'),
    render: (device, ctx) => (
      <code>{device.pci_address || ctx.t('host.deviceInventoryTable.notAvailable')}</code>
    ),
  },
  {
    key: 'category',
    kind: 'badge',
    labelKey: 'host.deviceInventoryTable.categoryHeader',
    titleKey: 'host.deviceInventoryTable.sortCategoryTitle',
    value: (device, ctx) =>
      device.device_category || ctx.t('host.deviceInventoryTable.otherCategory'),
    render: (device, ctx) =>
      badge(
        categoryTone(device.device_category),
        device.device_category || ctx.t('host.deviceInventoryTable.otherCategory')
      ),
  },
  {
    key: 'driver',
    kind: 'text',
    labelKey: 'host.deviceInventoryTable.driverHeader',
    titleKey: 'host.deviceInventoryTable.sortDriverTitle',
    priority: 1,
    value: (device, ctx) => device.driver_name || ctx.t('host.deviceInventoryTable.none'),
  },
  {
    key: 'status',
    kind: 'badge',
    labelKey: 'host.deviceInventoryTable.statusHeader',
    titleKey: 'host.deviceInventoryTable.sortStatusTitle',
    value: (device, ctx) => ctx.t(`hosts.devices.state.${deviceState(device)}`),
    render: (device, ctx) =>
      badge(deviceStateTone(device), ctx.t(`hosts.devices.state.${deviceState(device)}`)),
  },
  {
    key: 'ppt',
    kind: 'badge',
    labelKey: 'host.deviceInventoryTable.pptStatusHeader',
    titleKey: 'host.deviceInventoryTable.sortPptStatusTitle',
    value: (device, ctx) =>
      ctx.t(`hosts.devices.ppt.${pptState(device)}`, { count: zonesOf(device).length }),
    render: (device, ctx) =>
      badge(
        pptStateTone(device),
        ctx.t(`hosts.devices.ppt.${pptState(device)}`, { count: zonesOf(device).length })
      ),
  },
  {
    key: 'zones',
    kind: 'badges',
    labelKey: 'host.deviceInventoryTable.assignedToHeader',
    priority: 1,
    value: device => zonesOf(device).join(', '),
    render: (device, ctx) => <ZonesCell device={device} ctx={ctx} />,
  },
];

const DetailsButton = ({ device, onOpen }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="btn btn-sm btn-info"
      data-action="device-details"
      title={t('host.deviceInventoryTable.rowTitle')}
      onClick={() => onOpen(device)}
    >
      <FaCircleInfo className="me-1" aria-hidden="true" />
      {t('host.pptDevicesTable.details')}
    </button>
  );
};

DetailsButton.propTypes = {
  device: PropTypes.object.isRequired,
  onOpen: PropTypes.func.isRequired,
};

/**
 * The devices table of the devices page, hyperweaver-ui's device
 * inventory card: the heading counting the devices, Discover devices,
 * which asks the agent to discover them again, the chevron that folds
 * the card, and the one `SubTable` over the devices the page's one
 * search binding left, each row's Details opening the device dialog,
 * where hyperweaver-ui opened it on the row's click.
 */
const DeviceInventoryTable = ({ search, count, busy, loaded, fold, ctx, onDiscover, onOpen }) => {
  const { t } = useTranslation();
  const title = t('host.deviceInventoryTable.titleWithCount', { count });
  const actions = (
    <button
      type="button"
      className="btn btn-sm btn-warning"
      data-action="discover"
      title={t('host.deviceInventoryTable.discoverTitle')}
      onClick={onDiscover}
      disabled={busy}
    >
      <FaRotate className="me-2" aria-hidden="true" />
      {t('host.deviceInventoryTable.discoverButton')}
    </button>
  );
  return (
    <div
      data-panel="devices-inventory"
      data-folded={fold.folded}
      data-count={count}
      className="mb-3"
    >
      <SectionHeading
        title={title}
        actions={actions}
        folded={fold.folded}
        onFold={fold.onFold}
        foldTitle={fold.title}
      />
      {fold.folded ? null : (
        <SubTable
          columns={DEVICE_COLUMNS}
          rows={search.rows}
          rowKey={deviceKey}
          rowProp="device"
          RowActions={DetailsButton}
          actionsProps={{ onOpen }}
          sort={search.sort}
          onSort={search.setSort}
          hiddenColumns={search.hiddenColumns}
          widths={search.widths}
          onResize={search.setColumnWidth}
          ctx={ctx}
          emptyText={t(
            loaded
              ? (search.filtering && 'pages.noMatches') || 'host.deviceInventoryTable.empty'
              : 'pages.loading'
          )}
        />
      )}
    </div>
  );
};

DeviceInventoryTable.propTypes = {
  search: detailSearchShape.isRequired,
  count: PropTypes.number.isRequired,
  busy: PropTypes.bool.isRequired,
  loaded: PropTypes.bool.isRequired,
  fold: PropTypes.shape({
    folded: PropTypes.bool.isRequired,
    onFold: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
  ctx: PropTypes.object.isRequired,
  onDiscover: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
};

export default DeviceInventoryTable;
