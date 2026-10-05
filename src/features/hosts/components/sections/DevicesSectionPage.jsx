import PropTypes from 'prop-types';

import { hostHasHypervisor } from '../../utils/capabilities';

import PciDevicesPage from './PciDevicesPage';
import UsbDevicesPage from './UsbDevicesPage';

/**
 * The Devices page of a host, behind `devices`: on a host that names
 * `virtualbox` the USB devices as VirtualBox lists them, over
 * `GET system/usb`; on every other host the PCI devices, their
 * passthrough and their discovery, over `GET host/devices` and its three
 * companion reads.
 */
const DevicesSectionPage = props =>
  hostHasHypervisor(props.server, 'virtualbox') ? (
    <UsbDevicesPage {...props} />
  ) : (
    <PciDevicesPage {...props} />
  );

DevicesSectionPage.propTypes = {
  server: PropTypes.object.isRequired,
};

export default DevicesSectionPage;
