import { describe, expect, it } from 'vitest';

import {
  changesOf,
  formTools,
  initialForm,
  isMarkedAttachment,
  seededForm,
} from '../../src/features/hosts/utils/settingsForm.js';

const bhyve = { capabilities: { hypervisors: ['bhyve'], features: ['zfs'] } };

const knobCurrent = { ram: 4096, vcpus: 2, bootrom: 'BHYVE_RELEASE_CSM', cpu_topology: null };

const stateOf = () => {
  const held = { form: initialForm() };
  const setForm = next => {
    held.form = typeof next === 'function' ? next(held.form) : next;
  };
  return { held, tools: formTools(setForm) };
};

describe('seededForm', () => {
  it('seeds the form and its seed from the detail', () => {
    const { form, seed } = seededForm({ zonename: 'web-1' }, knobCurrent);
    expect(form.values.ram).toBe('4096');
    expect(form.initial).toBe(seed.values);
    expect(form.cpuTopo).toEqual({ sockets: '', cores: '', threads: '' });
    expect(form.addDisks).toEqual([]);
    expect(seed.values.vcpus).toBe('2');
  });
});

describe('formTools', () => {
  it('writes one key by value or by function', () => {
    const { held, tools } = stateOf();
    tools.update('vboxJson', '{}');
    tools.set('autoboot')('true');
    tools.update('addNics', list => [...list, { key: 1 }]);
    expect(held.form.vboxJson).toBe('{}');
    expect(held.form.autoboot).toBe('true');
    expect(held.form.addNics).toEqual([{ key: 1 }]);
  });

  it('toggles a name in a list and marks an attachment once', () => {
    const { held, tools } = stateOf();
    const toggle = tools.toggleIn('removeZoneDisks');
    toggle('disk0');
    toggle('disk1');
    toggle('disk0');
    expect(held.form.removeZoneDisks).toEqual(['disk1']);
    const entry = { controller: 'SATA', port: 1, device: 0, kind: 'cdrom', path: '' };
    tools.toggleAttachment(entry);
    expect(held.form.removeAttachments).toEqual([
      { controller: 'SATA', port: 1, device: 0, kind: 'cdrom' },
    ]);
    expect(isMarkedAttachment(held.form, entry)).toBe(true);
    tools.toggleAttachment(entry);
    expect(isMarkedAttachment(held.form, entry)).toBe(false);
  });

  it('writes a hardware value, a credential with its touched mark and a zone NIC edit', () => {
    const { held, tools } = stateOf();
    tools.setHardwareValue('cpu', 'hotplug', 'on');
    tools.setCred('vagrant_user', 'x');
    tools.setCred('vagrant_user', 'y');
    tools.editZoneNic('vnic0', 'vlan_id', '5');
    tools.editZoneNicProp('vnic0', 'mtu', '9000');
    expect(held.form.hardware).toEqual({ cpu: { hotplug: 'on' } });
    expect(held.form.creds).toEqual({ vagrant_user: 'y' });
    expect(held.form.credsTouched).toEqual(['vagrant_user']);
    expect(held.form.zoneNicEdits).toEqual({ vnic0: { vlan_id: '5', props: { mtu: '9000' } } });
  });
});

describe('changesOf', () => {
  const opened = () => seededForm({ zonename: 'web-1' }, knobCurrent);

  it('says nothing changed while the form equals its seed', () => {
    const { form, seed } = opened();
    expect(changesOf({ form, seed, isUtm: false, server: bhyve, knobCurrent })).toEqual({
      changes: null,
      problemKey: 'machineEdit.machineSettings.nothingChanged',
    });
  });

  it('sends the changed members with the resource controls of a bhyve host', () => {
    const { form, seed } = opened();
    const changed = { ...form, values: { ...form.values, ram: '8G' } };
    expect(
      changesOf({
        form: changed,
        seed,
        isUtm: false,
        server: bhyve,
        knobCurrent,
        resourceChanges: { cpu_shares: 200 },
      })
    ).toEqual({ changes: { ram: '8G', cpu_shares: 200 }, problemKey: '' });
  });

  it('refuses a vbox passthrough that is no JSON and a half-typed topology', () => {
    const { form, seed } = opened();
    expect(
      changesOf({
        form: { ...form, vboxJson: '{' },
        seed,
        isUtm: false,
        server: bhyve,
        knobCurrent,
      }).problemKey
    ).toBe('machineEdit.machineSettings.vboxJsonInvalid');
    expect(
      changesOf({
        form: { ...form, cpuMode: 'complex', cpuTopo: { sockets: '1', cores: '', threads: '' } },
        seed,
        isUtm: false,
        server: bhyve,
        knobCurrent,
      }).problemKey
    ).toBe('machineEdit.machineSettings.complexCpuTopologyRequired');
  });

  it('merges a vbox passthrough over the hardware sections', () => {
    const { form, seed } = opened();
    const changed = {
      ...form,
      hardware: { cpu: { hotplug: 'on' } },
      vboxJson: '{"directives":[{"directive":"--vram","value":"64"}]}',
    };
    expect(
      changesOf({ form: changed, seed, isUtm: false, server: bhyve, knobCurrent }).changes
    ).toEqual({
      vbox: { cpu: { hotplug: 'on' }, directives: [{ directive: '--vram', value: '64' }] },
    });
  });
});
