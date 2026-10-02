import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FaCube, FaEthernet, FaMicrochip } from 'react-icons/fa6';

import RecordRows from '../../../components/common/RecordRows';
import { categoryTone } from '../utils/DeviceUtils';

const badge = (tone, content) => <span className={`badge text-bg-${tone}`}>{content}</span>;

const yesNo = (value, t) =>
  badge(
    value ? 'success' : 'warning',
    t(value ? 'host.deviceDetailsModal.yes' : 'host.deviceDetailsModal.no')
  );

const identityRows = (device, t) => [
  {
    key: 'name',
    label: t('host.deviceDetailsModal.deviceName'),
    value: device.device_name || t('host.deviceDetailsModal.unknown'),
  },
  {
    key: 'vendor',
    label: t('host.deviceDetailsModal.vendor'),
    value: device.vendor_name || t('host.deviceDetailsModal.unknown'),
  },
  {
    key: 'vendorId',
    label: t('host.deviceDetailsModal.vendorId'),
    value: <code>{device.vendor_id || t('host.deviceDetailsModal.na')}</code>,
  },
  {
    key: 'deviceId',
    label: t('host.deviceDetailsModal.deviceId'),
    value: <code>{device.device_id || t('host.deviceDetailsModal.na')}</code>,
  },
  {
    key: 'pci',
    label: t('host.deviceDetailsModal.pciAddress'),
    value: <code>{device.pci_address || t('host.deviceDetailsModal.na')}</code>,
  },
  {
    key: 'category',
    label: t('host.deviceDetailsModal.category'),
    value: badge(
      categoryTone(device.device_category),
      device.device_category || t('host.deviceDetailsModal.other')
    ),
  },
];

const driverRows = (device, t, language) => [
  {
    key: 'driver',
    label: t('host.deviceDetailsModal.driverName'),
    value: device.driver_name || t('host.deviceDetailsModal.none'),
  },
  {
    key: 'instance',
    label: t('host.deviceDetailsModal.driverInstance'),
    value:
      device.driver_instance === undefined
        ? t('host.deviceDetailsModal.na')
        : device.driver_instance,
  },
  {
    key: 'attached',
    label: t('host.deviceDetailsModal.driverAttached'),
    value: yesNo(device.driver_attached, t),
  },
  {
    key: 'pptCapable',
    label: t('host.deviceDetailsModal.pptCapable'),
    value: badge(
      device.ppt_capable ? 'success' : 'dark',
      t(device.ppt_capable ? 'host.deviceDetailsModal.yes' : 'host.deviceDetailsModal.no')
    ),
  },
  {
    key: 'pptPath',
    label: t('host.deviceDetailsModal.pptDevicePath'),
    value: <code>{device.ppt_device_path || t('host.deviceDetailsModal.na')}</code>,
  },
  {
    key: 'scanned',
    label: t('host.deviceDetailsModal.scanTimestamp'),
    value: device.scan_timestamp
      ? new Date(device.scan_timestamp).toLocaleString(language)
      : t('host.deviceDetailsModal.unknown'),
  },
];

/**
 * The device dialog of the devices page, hyperweaver-ui's device
 * details, a list dialog: the identity in one record and the driver and
 * passthrough facts in another, the zones the device is assigned to as
 * badges, and the note that the device is also a network interface
 * where the agent says so.
 */
const DeviceDetailsModal = ({ device, onClose }) => {
  const { t, i18n } = useTranslation();
  const zones = device.assigned_to_zones || [];
  return (
    <Modal show onHide={onClose} dialogClassName="list-modal" scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h5">
          <FaMicrochip className="me-2" aria-hidden="true" />
          {t('host.deviceDetailsModal.title')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body data-dialog="device-details">
        <div className="row g-3">
          <div className="col-12 col-lg-6">
            <RecordRows rows={identityRows(device, t)} className="mb-0" />
          </div>
          <div className="col-12 col-lg-6">
            <RecordRows rows={driverRows(device, t, i18n.language)} className="mb-0" />
          </div>
        </div>
        {zones.length > 0 ? (
          <div className="mt-4" data-zones>
            <h6 className="text-muted">{t('host.deviceDetailsModal.zoneAssignments')}</h6>
            <div className="d-flex flex-wrap gap-1">
              {zones.map(zone => (
                <span
                  key={zone}
                  className="badge text-bg-warning d-inline-flex align-items-center gap-1"
                >
                  <FaCube aria-hidden="true" />
                  <span>{zone}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {device.found_in_network_interfaces ? (
          <div className="alert alert-info mt-4 mb-0" data-note="also-interface">
            <FaEthernet className="me-2" aria-hidden="true" />
            {t('host.deviceDetailsModal.alsoInNetworkInterfaces')}
          </div>
        ) : null}
      </Modal.Body>
    </Modal>
  );
};

DeviceDetailsModal.propTypes = {
  device: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default DeviceDetailsModal;
