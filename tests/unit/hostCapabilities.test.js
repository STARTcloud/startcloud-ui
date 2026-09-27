import { describe, expect, it } from 'vitest';

import { hostHasFeature, hostHasHypervisor } from '../../src/features/hosts/utils/capabilities.js';
import {
  canCreateMachines,
  canDestroyMachines,
  canStartStopMachines,
} from '../../src/features/hosts/utils/permissions.js';

const vbox = {
  capabilities: { hypervisors: ['virtualbox'], features: ['machines', 'machine-suspend'] },
};
const bhyve = { capabilities: { hypervisors: ['bhyve'], features: ['machines', 'guest-agent'] } };
const bare = { capabilities: {} };

describe('hostHasFeature', () => {
  it('answers true only when the row lists the token', () => {
    expect(hostHasFeature(vbox, 'machine-suspend')).toBe(true);
    expect(hostHasFeature(vbox, 'guest-agent')).toBe(false);
    expect(hostHasFeature(bhyve, 'guest-agent')).toBe(true);
  });

  it('answers false for a row without the list and for no row', () => {
    expect(hostHasFeature(bare, 'machines')).toBe(false);
    expect(hostHasFeature(null, 'machines')).toBe(false);
  });
});

describe('hostHasHypervisor', () => {
  it('answers true only for a hypervisor the row names', () => {
    expect(hostHasHypervisor(vbox, 'virtualbox')).toBe(true);
    expect(hostHasHypervisor(vbox, 'bhyve')).toBe(false);
    expect(hostHasHypervisor(bhyve, 'bhyve')).toBe(true);
  });

  it('answers false for a row without the list and for no row', () => {
    expect(hostHasHypervisor(bare, 'bhyve')).toBe(false);
    expect(hostHasHypervisor(null, 'bhyve')).toBe(false);
  });
});

describe('machine permissions', () => {
  it('lets every role start and stop and an admin alone create or destroy', () => {
    expect(canStartStopMachines('user')).toBe(true);
    expect(canCreateMachines('user')).toBe(false);
    expect(canCreateMachines('admin')).toBe(true);
    expect(canCreateMachines('super-admin')).toBe(true);
    expect(canDestroyMachines('user')).toBe(false);
  });

  it('ranks an unknown role nowhere', () => {
    expect(canStartStopMachines(undefined)).toBe(false);
    expect(canCreateMachines('guest')).toBe(false);
  });
});
