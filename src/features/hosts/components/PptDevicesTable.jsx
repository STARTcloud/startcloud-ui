import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FaCircleInfo } from 'react-icons/fa6';

import SectionHeading from '../../../components/common/SectionHeading';
import SubTable from '../../../components/common/SubTable';
import { useTablePrefs } from '../../../hooks/useTablePrefs';
import { deviceKey } from '../utils/DeviceUtils';

const badge = (tone, content) => <span className={`badge text-bg-${tone}`}>{content}</span>;

const zonesOf = device => device.assigned_to_zones || [];

const assigned = device => zonesOf(device).length > 0;

const ZonesCell = ({ device, ctx }) => {
  if (!assigned(device)) {
    return <span className="text-muted">{ctx.t('host.pptDevicesTable.none')}</span>;
  }
  return (
    <span className="d-inline-flex flex-wrap gap-1">
      {zonesOf(device).map(zone => (
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
 * The columns of the passthrough devices table, hyperweaver-ui's: the
 * device, its PCI address, its passthrough path, whether it is assigned
 * and the zones it is assigned to.
 */
export const PPT_COLUMNS = [
  {
    key: 'name',
    kind: 'name',
    labelKey: 'host.pptDevicesTable.deviceName',
    value: (device, ctx) => device.device_name || ctx.t('host.pptDevicesTable.unknownDevice'),
    render: (device, ctx) => (
      <strong>{device.device_name || ctx.t('host.pptDevicesTable.unknownDevice')}</strong>
    ),
  },
  {
    key: 'pci',
    kind: 'text',
    labelKey: 'host.pptDevicesTable.pciAddress',
    priority: 3,
    value: (device, ctx) => device.pci_address || ctx.t('host.pptDevicesTable.notAvailable'),
    render: (device, ctx) => (
      <code>{device.pci_address || ctx.t('host.pptDevicesTable.notAvailable')}</code>
    ),
  },
  {
    key: 'path',
    kind: 'text',
    labelKey: 'host.pptDevicesTable.pptDevicePath',
    priority: 4,
    value: (device, ctx) => device.ppt_device_path || ctx.t('host.pptDevicesTable.notAvailable'),
    render: (device, ctx) => (
      <code>{device.ppt_device_path || ctx.t('host.pptDevicesTable.notAvailable')}</code>
    ),
  },
  {
    key: 'assignment',
    kind: 'badge',
    labelKey: 'host.pptDevicesTable.assignmentStatus',
    value: (device, ctx) =>
      ctx.t(assigned(device) ? 'host.pptDevicesTable.assigned' : 'host.pptDevicesTable.available'),
    render: (device, ctx) =>
      badge(
        assigned(device) ? 'warning' : 'success',
        ctx.t(assigned(device) ? 'host.pptDevicesTable.assigned' : 'host.pptDevicesTable.available')
      ),
  },
  {
    key: 'zones',
    kind: 'badges',
    labelKey: 'host.pptDevicesTable.assignedZones',
    priority: 5,
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
      data-action="ppt-details"
      title={t('host.pptDevicesTable.viewDeviceDetails')}
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
 * The passthrough devices table of the devices page, hyperweaver-ui's
 * card over the `ppt_devices` of the passthrough status: the heading
 * counting them, the chevron that folds the card, and the one
 * `SubTable`, its sort and widths kept under `table_prefs_ppt_devices`,
 * each row's Details opening the device dialog. Nothing draws while the
 * host answered no passthrough device.
 */
const PptDevicesTable = ({ devices, fold, ctx, onOpen }) => {
  const { t } = useTranslation();
  const prefs = useTablePrefs('table_prefs_ppt_devices', PPT_COLUMNS);
  if (devices.length === 0) {
    return null;
  }
  const title = t('host.pptDevicesTable.title', { count: devices.length });
  return (
    <div
      data-panel="devices-ppt"
      data-folded={fold.folded}
      data-count={devices.length}
      className="mb-3"
    >
      <SectionHeading
        title={title}
        folded={fold.folded}
        onFold={fold.onFold}
        foldTitle={fold.title}
      />
      {fold.folded ? null : (
        <SubTable
          columns={PPT_COLUMNS}
          rows={devices}
          rowKey={deviceKey}
          rowProp="device"
          RowActions={DetailsButton}
          actionsProps={{ onOpen }}
          sort={prefs.sort}
          onSort={prefs.setSort}
          hiddenColumns={prefs.hiddenColumns}
          widths={prefs.widths}
          onResize={prefs.setColumnWidth}
          ctx={ctx}
          emptyText={t('host.deviceInventoryTable.empty')}
        />
      )}
    </div>
  );
};

PptDevicesTable.propTypes = {
  devices: PropTypes.array.isRequired,
  fold: PropTypes.shape({
    folded: PropTypes.bool.isRequired,
    onFold: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
  ctx: PropTypes.object.isRequired,
  onOpen: PropTypes.func.isRequired,
};

export default PptDevicesTable;
