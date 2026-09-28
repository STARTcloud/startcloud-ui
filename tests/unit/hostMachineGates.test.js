import { describe, expect, it } from 'vitest';

import { gatesOf } from '../../src/features/hosts/utils/capabilities.js';

const vbox = {
  capabilities: { hypervisors: ['virtualbox'], features: ['machines', 'machine-suspend'] },
};
const bhyve = {
  capabilities: { hypervisors: ['bhyve'], features: ['machines', 'guest-agent'] },
};
const bhyveBare = { capabilities: { hypervisors: ['bhyve'], features: ['machines'] } };
const resuming = {
  capabilities: {
    hypervisors: ['bhyve'],
    features: ['machines', 'machine-suspend', 'machine-resume-suspended'],
  },
};

describe('gatesOf', () => {
  it('offers pause on a host that names virtualbox and never for a UTM machine', () => {
    expect(gatesOf({ server: vbox, machine: { hypervisor: 'virtualbox' } }).pause).toBe(true);
    expect(gatesOf({ server: vbox, machine: { hypervisor: 'utm' } }).pause).toBe(false);
    expect(gatesOf({ server: bhyve, machine: { brand: 'bhyve' } }).pause).toBe(false);
  });

  it('marks a UTM machine by its own row alone', () => {
    expect(gatesOf({ server: vbox, machine: { hypervisor: 'utm' } }).utm).toBe(true);
    expect(gatesOf({ server: vbox, machine: { hypervisor: 'virtualbox' } }).utm).toBe(false);
    expect(gatesOf({ server: bhyve, machine: { brand: 'bhyve' } }).utm).toBe(false);
  });

  it('offers suspend behind machine-suspend', () => {
    expect(gatesOf({ server: vbox, machine: { status: 'running' } }).suspend).toBe(true);
    expect(gatesOf({ server: bhyve, machine: { status: 'running' } }).suspend).toBe(false);
  });

  it('offers resume by the status of the machine and the token that takes it', () => {
    expect(gatesOf({ server: vbox, machine: { status: 'paused' } }).resume).toBe(true);
    expect(gatesOf({ server: vbox, machine: { status: 'suspended' } }).resume).toBe(false);
    expect(gatesOf({ server: resuming, machine: { status: 'suspended' } }).resume).toBe(true);
    expect(gatesOf({ server: resuming, machine: { status: 'running' } }).resume).toBe(false);
  });

  it('reaches the guest on virtualbox and on a bhyve host that lists guest-agent', () => {
    expect(gatesOf({ server: vbox, machine: null }).guest).toBe(true);
    expect(gatesOf({ server: bhyve, machine: null }).guest).toBe(true);
    expect(gatesOf({ server: bhyveBare, machine: null }).guest).toBe(false);
  });

  it('offers nothing for no host row', () => {
    expect(
      gatesOf({ server: null, machine: { status: 'paused', hypervisor: 'virtualbox' } })
    ).toEqual({ utm: false, pause: false, suspend: false, resume: false, guest: false });
  });
});
