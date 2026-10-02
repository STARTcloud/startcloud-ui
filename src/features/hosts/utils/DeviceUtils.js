const CATEGORY_TONES = { network: 'info', storage: 'primary', display: 'success' };

const assigned = device => Boolean(device?.assigned_to_zones?.length);

/**
 * The tone a device's category is drawn in, hyperweaver-ui's: info for
 * network, primary for storage, success for display, dark for every
 * other.
 *
 * @param {string} category - The device's `device_category`
 * @returns {string} The Bootstrap tone
 */
export const categoryTone = category => CATEGORY_TONES[category] || 'dark';

/**
 * The state one device is in, hyperweaver-ui's four: `noDriver` while no
 * driver is attached, `pptAssigned` while it is enabled for passthrough
 * and assigned, `pptReady` while enabled and free, `driverAttached`
 * otherwise.
 *
 * @param {Object} device - The device's row
 * @returns {string} The state
 */
export const deviceState = device => {
  if (!device.driver_attached) {
    return 'noDriver';
  }
  if (device.ppt_enabled) {
    return assigned(device) ? 'pptAssigned' : 'pptReady';
  }
  return 'driverAttached';
};

const STATE_TONES = {
  noDriver: 'warning',
  pptAssigned: 'info',
  pptReady: 'success',
  driverAttached: 'dark',
};

/**
 * The tone a device's state is drawn in.
 *
 * @param {Object} device - The device's row
 * @returns {string} The Bootstrap tone
 */
export const deviceStateTone = device => STATE_TONES[deviceState(device)];

/**
 * The passthrough state of one device, hyperweaver-ui's three:
 * `notCapable`, `assigned` and `available`.
 *
 * @param {Object} device - The device's row
 * @returns {string} The state
 */
export const pptState = device => {
  if (!device.ppt_capable) {
    return 'notCapable';
  }
  return assigned(device) ? 'assigned' : 'available';
};

const PPT_TONES = { notCapable: 'dark', assigned: 'warning', available: 'success' };

/**
 * The tone a device's passthrough state is drawn in.
 *
 * @param {Object} device - The device's row
 * @returns {string} The Bootstrap tone
 */
export const pptStateTone = device => PPT_TONES[pptState(device)];

/**
 * The key one device is told from another by, its id or its PCI
 * address or its name.
 *
 * @param {Object} device - The device's row
 * @returns {string} The key
 */
export const deviceKey = device =>
  String(device.id ?? device.pci_address ?? device.device_name ?? '');

/**
 * Whether a device's row matches the navbar's query: its name, its
 * vendor, its PCI address or its driver.
 *
 * @param {Object} device - The device's row
 * @param {string} needle - The query, lower-cased
 * @returns {boolean} True when the row matches
 */
export const matchesDevice = (device, needle) =>
  [device.device_name, device.vendor_name, device.pci_address, device.driver_name]
    .filter(Boolean)
    .some(text => String(text).toLowerCase().includes(needle));

/**
 * The passthrough words a device's row narrows by, hyperweaver-ui's
 * four filters: `enabled` while enabled, `disabled` while not capable,
 * and of a capable device `assigned` or `available`.
 *
 * @param {Object} device - The device's row
 * @returns {Array<string>} The words
 */
export const pptFilterValues = device => [
  ...(device.ppt_enabled ? ['enabled'] : []),
  ...(device.ppt_capable ? [] : ['disabled']),
  ...(device.ppt_capable ? [assigned(device) ? 'assigned' : 'available'] : []),
];

export const PPT_FILTER_LABELS = {
  enabled: 'host.deviceFilters.pptCapableOption',
  disabled: 'host.deviceFilters.notPptCapableOption',
  available: 'host.deviceFilters.pptAvailableOption',
  assigned: 'host.deviceFilters.pptAssignedOption',
};

export const DRIVER_FILTER_LABELS = {
  attached: 'host.deviceFilters.driverAttachedOption',
  detached: 'host.deviceFilters.noDriverOption',
};

/**
 * The filter groups of the devices table, hyperweaver-ui's three selects:
 * the category, the passthrough state and the driver state.
 */
export const DEVICE_FILTERS = [
  {
    key: 'category',
    labelKey: 'host.deviceFilters.categoryLabel',
    values: device => (device.device_category ? [device.device_category] : []),
    activeClass: 'bg-info',
    labelFor: value => value.charAt(0).toUpperCase() + value.slice(1),
  },
  {
    key: 'ppt',
    labelKey: 'host.deviceFilters.pptStatusLabel',
    values: pptFilterValues,
    order: ['enabled', 'disabled', 'available', 'assigned'],
    activeClass: 'bg-success',
    labelFor: (value, t) => t(PPT_FILTER_LABELS[value]),
  },
  {
    key: 'driver',
    labelKey: 'host.deviceFilters.driverStatusLabel',
    values: device => [device.driver_attached ? 'attached' : 'detached'],
    order: ['attached', 'detached'],
    activeClass: 'bg-primary',
    labelFor: (value, t) => t(DRIVER_FILTER_LABELS[value]),
  },
];

const CSV_HEADERS = [
  'Device Name',
  'Vendor',
  'PCI Address',
  'Category',
  'Driver',
  'PPT Enabled',
  'Assigned To',
];

const quoted = value => `"${value || ''}"`;

/**
 * The devices as the CSV hyperweaver-ui exported, its seven columns.
 *
 * @param {Array<Object>} devices - The rows
 * @returns {string} The CSV text
 */
export const devicesCsv = devices =>
  [
    CSV_HEADERS.join(','),
    ...devices.map(device =>
      [
        quoted(device.device_name),
        quoted(device.vendor_name),
        quoted(device.pci_address),
        quoted(device.device_category),
        quoted(device.driver_name),
        device.ppt_enabled ? 'Yes' : 'No',
        quoted(device.assigned_to_zones?.join(', ')),
      ].join(',')
    ),
  ].join('\n');

/**
 * The devices as the JSON hyperweaver-ui exported: the host, the instant
 * and the rows.
 *
 * @param {Array<Object>} devices - The rows
 * @param {string} hostname - The host's name
 * @param {Date} at - The instant
 * @returns {string} The JSON text
 */
export const devicesJson = (devices, hostname, at) =>
  JSON.stringify({ server: hostname, export_date: at.toISOString(), devices }, null, 2);

/**
 * The file name of an export, `devices_{host}_{date}.{format}`.
 *
 * @param {string} hostname - The host's name
 * @param {Date} at - The instant
 * @param {string} format - `csv` or `json`
 * @returns {string} The file name
 */
export const exportFileName = (hostname, at, format) =>
  `devices_${hostname || 'unknown'}_${at.toISOString().split('T')[0]}.${format}`;

/**
 * Hands the browser a file to save, hyperweaver-ui's export: a blob of
 * the text under the name, opened through a link that is clicked once.
 *
 * @param {Object} file - The file
 * @param {string} file.text - The text
 * @param {string} file.type - The media type
 * @param {string} file.name - The file name
 */
export const saveFile = ({ text, type, name }) => {
  const url = window.URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.URL.revokeObjectURL(url);
};

/**
 * Export the devices as hyperweaver-ui did, a CSV or a JSON file named
 * by the host and the day.
 *
 * @param {Array<Object>} devices - The rows
 * @param {string} hostname - The host's name
 * @param {string} format - `csv` or `json`
 */
export const exportDeviceData = (devices, hostname, format) => {
  const at = new Date();
  if (format === 'json') {
    saveFile({
      text: devicesJson(devices, hostname, at),
      type: 'application/json',
      name: exportFileName(hostname, at, 'json'),
    });
    return;
  }
  saveFile({
    text: devicesCsv(devices),
    type: 'text/csv',
    name: exportFileName(hostname, at, 'csv'),
  });
};
