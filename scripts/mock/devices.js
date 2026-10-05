import { featuresOf, runningOf } from './fleet.js';
import { now, ok, problem, refusal } from './kit.js';

const DEVICES = [
  {
    id: 1,
    device_name: 'Intel I350 Gigabit Network Connection',
    vendor_name: 'Intel Corporation',
    vendor_id: '8086',
    device_id: '1521',
    pci_address: '0000:03:00.0',
    device_category: 'network',
    driver_name: 'igb',
    driver_instance: 0,
    driver_attached: true,
    ppt_capable: true,
    ppt_enabled: false,
    ppt_device_path: null,
    assigned: 0,
    found_in_network_interfaces: true,
  },
  {
    id: 2,
    device_name: 'Intel I350 Gigabit Network Connection',
    vendor_name: 'Intel Corporation',
    vendor_id: '8086',
    device_id: '1521',
    pci_address: '0000:03:00.1',
    device_category: 'network',
    driver_name: 'igb',
    driver_instance: 1,
    driver_attached: true,
    ppt_capable: true,
    ppt_enabled: false,
    ppt_device_path: null,
    assigned: 0,
    found_in_network_interfaces: true,
  },
  {
    id: 3,
    device_name: 'LSI SAS3008 PCI-Express Fusion-MPT SAS-3',
    vendor_name: 'Broadcom / LSI',
    vendor_id: '1000',
    device_id: '0097',
    pci_address: '0000:01:00.0',
    device_category: 'storage',
    driver_name: 'mpt_sas',
    driver_instance: 0,
    driver_attached: true,
    ppt_capable: false,
    ppt_enabled: false,
    ppt_device_path: null,
    assigned: 0,
    found_in_network_interfaces: false,
  },
  {
    id: 4,
    device_name: 'NVIDIA GA104GL [RTX A4000]',
    vendor_name: 'NVIDIA Corporation',
    vendor_id: '10de',
    device_id: '24b0',
    pci_address: '0000:41:00.0',
    device_category: 'display',
    driver_name: 'ppt',
    driver_instance: 0,
    driver_attached: true,
    ppt_capable: true,
    ppt_enabled: true,
    ppt_device_path: '/dev/ppt0',
    assigned: 1,
    found_in_network_interfaces: false,
  },
  {
    id: 5,
    device_name: 'Mellanox ConnectX-4 Lx',
    vendor_name: 'Mellanox Technologies',
    vendor_id: '15b3',
    device_id: '1015',
    pci_address: '0000:81:00.0',
    device_category: 'network',
    driver_name: 'ppt',
    driver_instance: 1,
    driver_attached: true,
    ppt_capable: true,
    ppt_enabled: true,
    ppt_device_path: '/dev/ppt1',
    assigned: 0,
    found_in_network_interfaces: false,
  },
  {
    id: 6,
    device_name: 'Samsung NVMe SSD Controller PM9A1',
    vendor_name: 'Samsung Electronics',
    vendor_id: '144d',
    device_id: 'a80a',
    pci_address: '0000:c1:00.0',
    device_category: 'storage',
    driver_name: 'nvme',
    driver_instance: 0,
    driver_attached: true,
    ppt_capable: true,
    ppt_enabled: false,
    ppt_device_path: null,
    assigned: 0,
    found_in_network_interfaces: false,
  },
  {
    id: 7,
    device_name: 'ASMedia ASM1142 USB 3.1 Host Controller',
    vendor_name: 'ASMedia Technology',
    vendor_id: '1b21',
    device_id: '1242',
    pci_address: '0000:c2:00.0',
    device_category: 'usb',
    driver_name: null,
    driver_instance: null,
    driver_attached: false,
    ppt_capable: true,
    ppt_enabled: false,
    ppt_device_path: null,
    assigned: 0,
    found_in_network_interfaces: false,
  },
  {
    id: 8,
    device_name: 'Intel C620 Series Chipset Family SATA Controller',
    vendor_name: 'Intel Corporation',
    vendor_id: '8086',
    device_id: 'a182',
    pci_address: '0000:00:11.5',
    device_category: 'storage',
    driver_name: 'ahci',
    driver_instance: 0,
    driver_attached: true,
    ppt_capable: false,
    ppt_enabled: false,
    ppt_device_path: null,
    assigned: 0,
    found_in_network_interfaces: false,
  },
];

const USB_DEVICES = [
  {
    uuid: '2f1a7b9c-0001-4d3e-9a6b-1c2d3e4f5a01',
    vendor_id: '046d',
    product_id: 'c52b',
    manufacturer: 'Logitech',
    product: 'USB Receiver',
    serial_number: '',
    address: '{2f1a7b9c-0001}#0002',
    state: 'Available',
  },
  {
    uuid: '2f1a7b9c-0002-4d3e-9a6b-1c2d3e4f5a02',
    vendor_id: '0781',
    product_id: '5583',
    manufacturer: 'SanDisk',
    product: 'Ultra Fit',
    serial_number: '4C530001230512345678',
    address: '{2f1a7b9c-0002}#0003',
    state: 'Captured',
  },
  {
    uuid: '2f1a7b9c-0003-4d3e-9a6b-1c2d3e4f5a03',
    vendor_id: '1050',
    product_id: '0407',
    manufacturer: 'Yubico',
    product: 'YubiKey OTP+FIDO+CCID',
    serial_number: '',
    address: '{2f1a7b9c-0003}#0004',
    state: 'Busy',
  },
];

const MEDIA = [
  [
    '/var/lib/hyperweaver/machines/build-win11/build-win11.vdi',
    'VDI',
    68719476736,
    null,
    ['build-win11'],
  ],
  [
    '/var/lib/hyperweaver/machines/ci-runner-1/disk1.vmdk',
    'VMDK',
    42949672960,
    'template',
    ['ci-runner-1'],
  ],
  ['/var/lib/hyperweaver/machines/db-replica/data.vdi', 'VDI', 107374182400, 'blank', []],
];

const offers = (host, token) => featuresOf(host).includes(token);

const usbListed = () => ok({ devices: USB_DEVICES, total: USB_DEVICES.length });

const mediaListed = () =>
  ok({
    media: MEDIA.map(([path, format, size, stamp, users]) => ({
      path,
      format,
      size_bytes: size,
      source_stamp: stamp,
      in_use_by: users,
    })),
    total: MEDIA.length,
  });

const behind = (token, handler) => ctx =>
  offers(ctx.host, token) ? handler(ctx) : problem(404, 'Not Found');

const rowOf = (host, device) => {
  const { assigned: count, ...rest } = device;
  return { ...rest, assigned_to_zones: runningOf(host).slice(0, count), scan_timestamp: now() };
};

const rowsOf = host => DEVICES.map(device => rowOf(host, device));

const flagOf = (url, name) => {
  const value = url.searchParams.get(name);
  return value === null ? null : value === 'true';
};

const wanted = url => {
  const category = url.searchParams.get('category') || '';
  const ppt = flagOf(url, 'ppt_enabled');
  const driver = flagOf(url, 'driver_attached');
  const available = flagOf(url, 'available');
  return row =>
    (!category || row.device_category === category) &&
    (ppt === null || row.ppt_enabled === ppt) &&
    (driver === null || row.driver_attached === driver) &&
    (available === null || (row.ppt_capable && row.assigned_to_zones.length === 0) === available);
};

const summaryOf = rows => ({
  total: rows.length,
  ppt_capable: rows.filter(row => row.ppt_capable).length,
  ppt_enabled: rows.filter(row => row.ppt_enabled).length,
  ppt_assigned: rows.filter(row => row.assigned_to_zones.length > 0).length,
  driver_attached: rows.filter(row => row.driver_attached).length,
});

const listed = ctx => {
  const rows = rowsOf(ctx.host).filter(wanted(ctx.url));
  return ok({ devices: rows, summary: summaryOf(rows), total: rows.length });
};

const available = ctx => {
  const category = ctx.url.searchParams.get('category') || '';
  const pptOnly = flagOf(ctx.url, 'ppt_only') === true;
  const rows = rowsOf(ctx.host).filter(
    row =>
      row.ppt_capable &&
      row.assigned_to_zones.length === 0 &&
      (!category || row.device_category === category) &&
      (!pptOnly || row.ppt_enabled)
  );
  return ok({ devices: rows, total: rows.length });
};

const categories = ctx => {
  const rows = rowsOf(ctx.host);
  const grouped = rows.reduce((groups, row) => {
    const name = row.device_category;
    const held = groups[name] || { total: 0, ppt_capable: 0, ppt_enabled: 0 };
    groups[name] = {
      total: held.total + 1,
      ppt_capable: held.ppt_capable + (row.ppt_capable ? 1 : 0),
      ppt_enabled: held.ppt_enabled + (row.ppt_enabled ? 1 : 0),
    };
    return groups;
  }, {});
  return ok({ categories: grouped, total: rows.length });
};

const pptStatus = ctx => {
  const rows = rowsOf(ctx.host).filter(row => row.ppt_enabled);
  return ok({
    ppt_devices: rows,
    summary: {
      total: rows.length,
      assigned: rows.filter(row => row.assigned_to_zones.length > 0).length,
      available: rows.filter(row => row.assigned_to_zones.length === 0).length,
    },
  });
};

const refreshed = () =>
  ok({ success: true, message: 'Device discovery refreshed', devices_found: DEVICES.length });

const shown = ctx => {
  const key = decodeURIComponent(ctx.params.device);
  const row = rowsOf(ctx.host).find(
    device => String(device.id) === key || device.pci_address === key
  );
  return row ? ok(row) : refusal(404, `Device ${key} not found`);
};

/**
 * The devices and media pages' reads on a host that lists `devices` and
 * `media`: the PCI devices as zoneweaver-agent's device controller
 * answers them, with their summary at `GET host/devices`, narrowed by
 * `category`, `ppt_enabled`, `driver_attached` and `available`, the
 * devices free for passthrough at `host/devices/available`, the count by
 * category at `host/devices/categories`, the passthrough overview at
 * `host/ppt-status`, a discovery asked again at `POST host/devices/refresh`
 * and one device by its id or its PCI address, a device enabled for
 * passthrough assigned to as many of the host's running machines as its
 * row names; the USB devices as hyperweaver-agent lists them from
 * VirtualBox at `GET system/usb`; and the hard-disk images VirtualBox
 * registers at `GET media` behind `media`.
 *
 * @param {Function} agentRoute - The router's `agentRoute`
 * @returns {void}
 */
export const mountDevices = agentRoute => {
  const devices = handler => behind('devices', handler);
  agentRoute('GET', 'system/usb', devices(usbListed));
  agentRoute('GET', 'media', behind('media', mediaListed));
  agentRoute('GET', 'host/devices', devices(listed));
  agentRoute('GET', 'host/devices/available', devices(available));
  agentRoute('GET', 'host/devices/categories', devices(categories));
  agentRoute('GET', 'host/ppt-status', devices(pptStatus));
  agentRoute('POST', 'host/devices/refresh', devices(refreshed));
  agentRoute('GET', 'host/devices/:device', devices(shown));
};
