import { describe, expect, it } from 'vitest';

import {
  hostHasFeature,
  hostHasHypervisor,
  hostResumes,
} from '../../src/features/hosts/utils/capabilities.js';
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

describe('hostResumes', () => {
  const both = {
    capabilities: { features: ['machine-suspend', 'machine-resume-suspended'] },
  };

  it('resumes a paused machine behind machine-suspend', () => {
    expect(hostResumes(vbox, { status: 'paused' })).toBe(true);
    expect(hostResumes(bhyve, { status: 'paused' })).toBe(false);
  });

  it('resumes a suspended machine behind machine-resume-suspended alone', () => {
    expect(hostResumes(vbox, { status: 'suspended' })).toBe(false);
    expect(hostResumes(both, { status: 'suspended' })).toBe(true);
  });

  it('resumes nothing that runs, is stopped or has no row', () => {
    expect(hostResumes(both, { status: 'running' })).toBe(false);
    expect(hostResumes(both, { status: 'stopped' })).toBe(false);
    expect(hostResumes(both, null)).toBe(false);
    expect(hostResumes(null, { status: 'paused' })).toBe(false);
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
