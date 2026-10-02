import { describe, expect, it } from 'vitest';

import { guestToolsOf } from '../../src/features/hosts/utils/guestTools.js';

const host = (hypervisors, features) => ({ capabilities: { hypervisors, features } });

describe('guestToolsOf', () => {
  it('offers Run in guest through the additions on a VirtualBox host and through the agent on a host that lists guest-agent', () => {
    const vbox = guestToolsOf({
      server: host(['virtualbox'], []),
      machine: { hypervisor: 'virtualbox' },
      role: 'admin',
      running: true,
    });
    expect(vbox).toEqual({ exec: true, flavor: 'additions', display: true });
    const zone = guestToolsOf({
      server: host(['bhyve'], ['guest-agent']),
      machine: { hypervisor: 'bhyve' },
      role: 'user',
      running: true,
    });
    expect(zone).toEqual({ exec: true, flavor: 'qga', display: false });
  });

  it('offers neither while the machine is off, the person may not operate it, or the guest is out of reach', () => {
    expect(
      guestToolsOf({
        server: host(['virtualbox'], []),
        machine: { hypervisor: 'virtualbox' },
        role: 'admin',
        running: false,
      })
    ).toEqual({ exec: false, flavor: 'additions', display: false });
    expect(
      guestToolsOf({
        server: host(['virtualbox'], []),
        machine: { hypervisor: 'virtualbox' },
        role: 'guest',
        running: true,
      }).exec
    ).toBe(false);
    expect(
      guestToolsOf({
        server: host(['bhyve'], []),
        machine: { hypervisor: 'bhyve' },
        role: 'admin',
        running: true,
      })
    ).toEqual({ exec: false, flavor: 'additions', display: false });
  });

  it('never offers the display size of a machine on UTM', () => {
    expect(
      guestToolsOf({
        server: host(['virtualbox', 'utm'], []),
        machine: { hypervisor: 'utm' },
        role: 'admin',
        running: true,
      })
    ).toEqual({ exec: true, flavor: 'additions', display: false });
  });
});
