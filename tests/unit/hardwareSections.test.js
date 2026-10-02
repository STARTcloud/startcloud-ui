import { describe, expect, it } from 'vitest';

import {
  HARDWARE_SECTIONS,
  buildHardwarePayload,
  buildPortsPayload,
  cpuTopoProduct,
  diffHardwarePayload,
} from '../../src/features/hosts/utils/hardwareSections.js';

describe('HARDWARE_SECTIONS', () => {
  it('names the eleven sections of the VirtualBox knob tree, autostart last', () => {
    expect(HARDWARE_SECTIONS.map(section => section.id)).toEqual([
      'cpu',
      'memory',
      'graphics',
      'audio',
      'usb',
      'integration',
      'platform',
      'firmware',
      'recording',
      'vrde',
      'autostart',
    ]);
  });
});

describe('buildHardwarePayload', () => {
  it('sends every set value, integers as numbers, and null while nothing is set', () => {
    expect(buildHardwarePayload({})).toBeNull();
    expect(buildHardwarePayload({ cpu: { hotplug: '', execution_cap: '' } })).toBeNull();
    expect(
      buildHardwarePayload({ cpu: { hotplug: 'on', execution_cap: '80' }, memory: { vram: '64' } })
    ).toEqual({ cpu: { hotplug: 'on', execution_cap: 80 }, memory: { vram: 64 } });
  });
});

describe('diffHardwarePayload', () => {
  it('sends only what differs from the seed and never a blank', () => {
    const seeded = { cpu: { hotplug: 'off', execution_cap: '100' } };
    expect(
      diffHardwarePayload({ cpu: { hotplug: 'off', execution_cap: '100' } }, seeded)
    ).toBeNull();
    expect(
      diffHardwarePayload(
        { cpu: { hotplug: 'on', execution_cap: '' }, vrde: { port: '5000' } },
        seeded
      )
    ).toEqual({ cpu: { hotplug: 'on' }, vrde: { port: '5000' } });
  });
});

describe('buildPortsPayload', () => {
  it('sends the rows with a port, the irq a number and the rest as typed', () => {
    expect(
      buildPortsPayload([
        { port: '1', io_base: ' 0x3F8 ', irq: '4', mode: 'disconnected', type: '', device: '' },
        { port: '', io_base: '', irq: '', mode: '', type: '', device: '' },
        { port: '2', io_base: '', irq: '', mode: '', type: '', device: '/dev/lp0' },
      ])
    ).toEqual([
      { port: 1, io_base: '0x3F8', irq: 4, mode: 'disconnected' },
      { port: 2, device: '/dev/lp0' },
    ]);
  });
});

describe('cpuTopoProduct', () => {
  it('multiplies the sockets, the cores and the threads, a blank as nothing', () => {
    expect(cpuTopoProduct({ sockets: '2', cores: '4', threads: '2' })).toBe(16);
    expect(cpuTopoProduct({ sockets: '', cores: '4', threads: '2' })).toBe(0);
  });
});
