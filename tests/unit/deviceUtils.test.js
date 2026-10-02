import { describe, expect, it } from 'vitest';

import {
  DEVICE_FILTERS,
  DRIVER_FILTER_LABELS,
  PPT_FILTER_LABELS,
  categoryTone,
  deviceKey,
  deviceState,
  deviceStateTone,
  devicesCsv,
  devicesJson,
  exportFileName,
  matchesDevice,
  pptFilterValues,
  pptState,
  pptStateTone,
} from '../../src/features/hosts/utils/DeviceUtils.js';

const t = key => key;

const AT = new Date('2026-09-27T12:00:00.000Z');

const NIC = {
  id: 1,
  device_name: 'Intel I350',
  vendor_name: 'Intel Corporation',
  pci_address: '0000:03:00.0',
  device_category: 'network',
  driver_name: 'igb',
  driver_attached: true,
  ppt_capable: true,
  ppt_enabled: false,
  assigned_to_zones: [],
};

const GPU = {
  ...NIC,
  id: 4,
  device_name: 'RTX A4000',
  vendor_name: 'NVIDIA',
  pci_address: '0000:41:00.0',
  device_category: 'display',
  driver_name: 'ppt',
  ppt_enabled: true,
  assigned_to_zones: ['web-1'],
};

const FREE = { ...GPU, id: 5, assigned_to_zones: [] };

const BARE = { ...NIC, id: 7, driver_name: null, driver_attached: false, device_category: 'usb' };

const SATA = { ...NIC, id: 8, ppt_capable: false, device_category: 'storage' };

describe('the tones and the states', () => {
  it('draws a category in its tone, dark for one it does not know', () => {
    expect(categoryTone('network')).toBe('info');
    expect(categoryTone('storage')).toBe('primary');
    expect(categoryTone('display')).toBe('success');
    expect(categoryTone('usb')).toBe('dark');
    expect(categoryTone(undefined)).toBe('dark');
  });

  it('names the state of a device and its tone', () => {
    expect(deviceState(BARE)).toBe('noDriver');
    expect(deviceState(GPU)).toBe('pptAssigned');
    expect(deviceState(FREE)).toBe('pptReady');
    expect(deviceState(NIC)).toBe('driverAttached');
    expect(deviceStateTone(BARE)).toBe('warning');
    expect(deviceStateTone(GPU)).toBe('info');
    expect(deviceStateTone(FREE)).toBe('success');
    expect(deviceStateTone(NIC)).toBe('dark');
  });

  it('names the passthrough state of a device and its tone', () => {
    expect(pptState(SATA)).toBe('notCapable');
    expect(pptState(GPU)).toBe('assigned');
    expect(pptState(NIC)).toBe('available');
    expect(pptStateTone(SATA)).toBe('dark');
    expect(pptStateTone(GPU)).toBe('warning');
    expect(pptStateTone(NIC)).toBe('success');
  });
});

describe('deviceKey and matchesDevice', () => {
  it('tells a device by its id, its PCI address or its name', () => {
    expect(deviceKey(NIC)).toBe('1');
    expect(deviceKey({ pci_address: '0000:01:00.0' })).toBe('0000:01:00.0');
    expect(deviceKey({ device_name: 'x' })).toBe('x');
    expect(deviceKey({})).toBe('');
  });

  it('finds a device by its name, vendor, PCI address or driver', () => {
    expect(matchesDevice(NIC, 'intel')).toBe(true);
    expect(matchesDevice(NIC, '03:00')).toBe(true);
    expect(matchesDevice(NIC, 'igb')).toBe(true);
    expect(matchesDevice(NIC, 'nvidia')).toBe(false);
    expect(matchesDevice(BARE, 'null')).toBe(false);
  });
});

describe('the filter groups', () => {
  it('names the category, the passthrough state and the driver state', () => {
    expect(DEVICE_FILTERS.map(group => group.key)).toEqual(['category', 'ppt', 'driver']);
    const [category, ppt, driver] = DEVICE_FILTERS;
    expect(category.values(NIC)).toEqual(['network']);
    expect(category.values({})).toEqual([]);
    expect(category.labelFor('network')).toBe('Network');
    expect(ppt.order).toEqual(['enabled', 'disabled', 'available', 'assigned']);
    expect(ppt.labelFor('assigned', t)).toBe(PPT_FILTER_LABELS.assigned);
    expect(driver.values(NIC)).toEqual(['attached']);
    expect(driver.values(BARE)).toEqual(['detached']);
    expect(driver.labelFor('detached', t)).toBe(DRIVER_FILTER_LABELS.detached);
  });

  it("answers the passthrough words of a device, hyperweaver-ui's four filters", () => {
    expect(pptFilterValues(NIC)).toEqual(['available']);
    expect(pptFilterValues(GPU)).toEqual(['enabled', 'assigned']);
    expect(pptFilterValues(FREE)).toEqual(['enabled', 'available']);
    expect(pptFilterValues(SATA)).toEqual(['disabled']);
  });
});

describe('the exports', () => {
  it('writes the seven CSV columns hyperweaver-ui exported', () => {
    const lines = devicesCsv([GPU, BARE]).split('\n');
    expect(lines[0]).toBe('Device Name,Vendor,PCI Address,Category,Driver,PPT Enabled,Assigned To');
    expect(lines[1]).toBe('"RTX A4000","NVIDIA","0000:41:00.0","display","ppt",Yes,"web-1"');
    expect(lines[2]).toBe('"Intel I350","Intel Corporation","0000:03:00.0","usb","",No,""');
  });

  it('writes the JSON with the host, the instant and the rows, and names the file by the host and the day', () => {
    expect(JSON.parse(devicesJson([NIC], 'zone-1', AT))).toEqual({
      server: 'zone-1',
      export_date: '2026-09-27T12:00:00.000Z',
      devices: [NIC],
    });
    expect(exportFileName('zone-1', AT, 'csv')).toBe('devices_zone-1_2026-09-27.csv');
    expect(exportFileName('', AT, 'json')).toBe('devices_unknown_2026-09-27.json');
  });
});
