import { describe, expect, it } from 'vitest';

import {
  CLONE_FORM,
  PUBLISH_FORM,
  canPublish,
  cloneBody,
  cloneCopies,
  cloneFormOf,
  cloneLinks,
  cloneProblem,
  cloneWireOf,
  defaultSourceOf,
  exportBody,
  hostImports,
  hostStreamsTasks,
  hostTemplatesSnapshots,
  importBody,
  machineChartGates,
  machineToolGates,
  publishBody,
  queuedTaskOf,
  resourceIssuesOf,
  resourceWarningsOf,
} from '../../src/features/hosts/utils/machineTools.js';

const hostOf = (hypervisors, features, more = {}) => ({
  capabilities: { hypervisors, features, ...more },
});

const vbox = hostOf(
  ['virtualbox'],
  ['machines', 'machine-snapshots', 'machine-create', 'machine-modify', 'templates', 'monitoring']
);
const zone = hostOf(
  ['bhyve'],
  ['machines', 'machine-snapshots', 'machine-create', 'machine-modify', 'zfs', 'monitoring']
);
const zoneTemplates = hostOf(['bhyve'], ['machines', 'machine-snapshots', 'zfs', 'templates']);
const bare = hostOf(['virtualbox'], ['machines']);

const VIRTUALBOX = cloneWireOf({ server: vbox, machine: { hypervisor: 'virtualbox' } });
const ZFS = cloneWireOf({ server: zone, machine: { brand: 'bhyve' } });
const UTM = cloneWireOf({ server: vbox, machine: { hypervisor: 'utm' } });

const NONE = {
  utm: false,
  snapshots: false,
  snapshot: false,
  rename: false,
  policy: false,
  holds: false,
  rollback: false,
  templates: false,
  snapshotTemplates: false,
  clone: false,
  move: false,
  install: false,
};

describe('machineToolGates', () => {
  it('offers the tools of a VirtualBox host to a person who may create machines', () => {
    const gates = machineToolGates({
      server: vbox,
      machine: { hypervisor: 'virtualbox' },
      role: 'admin',
    });
    expect(gates).toEqual({
      utm: false,
      snapshots: true,
      snapshot: true,
      rename: true,
      policy: true,
      holds: false,
      rollback: false,
      templates: true,
      snapshotTemplates: false,
      clone: true,
      move: true,
      install: true,
    });
  });

  it('offers the holds and the rollback on a host that lists zfs and no move on a bhyve host', () => {
    const gates = machineToolGates({ server: zone, machine: { brand: 'bhyve' }, role: 'admin' });
    expect(gates.holds).toBe(true);
    expect(gates.rollback).toBe(true);
    expect(gates.move).toBe(false);
    expect(gates.templates).toBe(false);
    expect(gates.snapshotTemplates).toBe(false);
  });

  it('offers the template of a snapshot where the host lists templates and zfs', () => {
    const gates = machineToolGates({ server: zoneTemplates, machine: null, role: 'admin' });
    expect(gates.templates).toBe(true);
    expect(gates.snapshotTemplates).toBe(true);
    expect(machineToolGates({ server: zoneTemplates, machine: null, role: 'user' })).toMatchObject({
      templates: false,
      snapshotTemplates: false,
    });
  });

  it('offers a machine on UTM no rename, no policy and no move', () => {
    const gates = machineToolGates({ server: vbox, machine: { hypervisor: 'utm' }, role: 'admin' });
    expect(gates.utm).toBe(true);
    expect(gates.snapshot).toBe(true);
    expect(gates.rename).toBe(false);
    expect(gates.policy).toBe(false);
    expect(gates.move).toBe(false);
  });

  it('leaves a person who may not create machines the read of the snapshots and the holds', () => {
    const gates = machineToolGates({ server: zone, machine: null, role: 'user' });
    expect(gates).toEqual({ ...NONE, snapshots: true, holds: true, rollback: true });
  });

  it('offers nothing of a host whose row lists no token and of no host row', () => {
    expect(machineToolGates({ server: bare, machine: null, role: 'admin' })).toEqual({
      ...NONE,
      move: true,
      install: true,
    });
    expect(machineToolGates({ server: null, machine: null, role: 'admin' })).toEqual(NONE);
  });
});

describe('hostTemplatesSnapshots', () => {
  it('answers true of a host that lists machine-snapshots and zfs alone', () => {
    expect(hostTemplatesSnapshots(zone)).toBe(true);
    expect(hostTemplatesSnapshots(vbox)).toBe(false);
    expect(hostTemplatesSnapshots(hostOf(['bhyve'], ['zfs']))).toBe(false);
    expect(hostTemplatesSnapshots(null)).toBe(false);
  });
});

describe('hostStreamsTasks', () => {
  const streaming = {
    features: ['hosts', 'events'],
    events: { path: '/api/events', topics: ['health', 'tasks', 'hosts'] },
  };
  const silent = { features: ['hosts', 'tasks'] };
  const agent = hostOf(['virtualbox'], ['tasks', 'events'], {
    events: { path: '/api/events', topics: ['health', 'tasks', 'hosts'] },
  });

  it('answers true while the serving host and the agent both stream the tasks topic', () => {
    expect(hostStreamsTasks(streaming, agent)).toBe(true);
    expect(hostStreamsTasks(streaming, { capabilities: streaming })).toBe(true);
  });

  it('answers false for an agent that streams nothing and for a serving host that does not', () => {
    expect(hostStreamsTasks(streaming, zone)).toBe(false);
    expect(hostStreamsTasks(silent, agent)).toBe(false);
    expect(hostStreamsTasks(silent, { capabilities: silent })).toBe(false);
    expect(hostStreamsTasks(streaming, null)).toBe(false);
  });

  it('answers false while the stream carries no tasks topic', () => {
    const health = { features: ['events'], events: { path: '/api/events', topics: ['health'] } };
    expect(hostStreamsTasks(health, agent)).toBe(false);
    expect(hostStreamsTasks(streaming, { capabilities: health })).toBe(false);
  });
});

describe('hostImports', () => {
  it('draws on a host that names virtualbox for a person who may create machines', () => {
    expect(hostImports(vbox, 'admin')).toBe(true);
    expect(hostImports(vbox, 'user')).toBe(false);
    expect(hostImports(zone, 'admin')).toBe(false);
    expect(hostImports(hostOf(['virtualbox'], ['tasks']), 'admin')).toBe(false);
    expect(hostImports(null, 'admin')).toBe(false);
  });
});

describe('machineChartGates', () => {
  it('draws the charts of a zone on a bhyve host that lists monitoring', () => {
    expect(machineChartGates({ server: zone, machine: null, running: false })).toEqual({
      zone: true,
      machine: false,
    });
  });

  it('draws the charts of a VirtualBox machine while it runs and never on UTM', () => {
    const machine = { hypervisor: 'virtualbox' };
    expect(machineChartGates({ server: vbox, machine, running: true }).machine).toBe(true);
    expect(machineChartGates({ server: vbox, machine, running: false }).machine).toBe(false);
    expect(
      machineChartGates({ server: vbox, machine: { hypervisor: 'utm' }, running: true }).machine
    ).toBe(false);
  });

  it('draws none on a host that lists no monitoring', () => {
    expect(machineChartGates({ server: bare, machine: null, running: true })).toEqual({
      zone: false,
      machine: false,
    });
  });
});

describe('queuedTaskOf', () => {
  it('reads the task of a queued answer, task_id or the parent of an orchestration', () => {
    expect(
      queuedTaskOf(
        { task_id: 'a1', operation: 'snapshot_take', machine_name: 'dev-1', status: 'pending' },
        'dev-1'
      )
    ).toEqual({
      id: 'a1',
      operation: 'snapshot_take',
      machine_name: 'dev-1',
      status: 'pending',
      parent_task_id: null,
    });
    expect(
      queuedTaskOf({ parent_task_id: 'p1', operation: 'zone_clone_orchestration' }, 'web-1')
    ).toEqual({
      id: 'p1',
      operation: 'zone_clone_orchestration',
      machine_name: 'web-1',
      status: 'pending',
      parent_task_id: null,
    });
  });

  it('answers null for an answer that names no task', () => {
    expect(queuedTaskOf({ success: true, status: 'completed' }, 'dev-1')).toBeNull();
    expect(queuedTaskOf(null, 'dev-1')).toBeNull();
  });
});

describe('cloneWireOf', () => {
  it('sends the snapshot of a VirtualBox machine as snapshot, the clone unlinked', () => {
    expect(VIRTUALBOX).toEqual({
      platform: 'virtualbox',
      picks: true,
      member: 'snapshot',
      linked: false,
      bare: false,
      live: false,
    });
  });

  it('sends the snapshot of a machine on a host of datasets as snapshot_name, the clone linked', () => {
    expect(ZFS).toEqual({
      platform: 'zfs',
      picks: true,
      member: 'snapshot_name',
      linked: true,
      bare: true,
      live: true,
    });
  });

  it('offers a machine on UTM no snapshot and no linked clone', () => {
    expect(UTM).toEqual({
      platform: 'utm',
      picks: false,
      member: '',
      linked: false,
      bare: false,
      live: true,
    });
  });

  it('offers the snapshots behind machine-snapshots alone', () => {
    expect(cloneWireOf({ server: bare, machine: null }).picks).toBe(false);
    expect(cloneWireOf({ server: hostOf(['bhyve'], ['zfs']), machine: null })).toMatchObject({
      platform: 'zfs',
      picks: false,
      bare: true,
    });
  });
});

describe('the clone form of a platform', () => {
  it('opens unlinked on VirtualBox and on UTM and linked on a host of datasets', () => {
    expect(cloneFormOf(VIRTUALBOX)).toEqual(CLONE_FORM);
    expect(cloneFormOf(UTM).linked).toBe(false);
    expect(cloneFormOf(ZFS)).toEqual({ ...CLONE_FORM, linked: true });
  });

  it('draws the panel of a copy where the platform picks a snapshot or links without one', () => {
    const copy = { ...CLONE_FORM, source: 'current' };
    expect(cloneCopies(copy, VIRTUALBOX)).toBe(true);
    expect(cloneCopies(copy, ZFS)).toBe(true);
    expect(cloneCopies(copy, UTM)).toBe(false);
    expect(cloneCopies(CLONE_FORM, ZFS)).toBe(false);
    expect(cloneCopies(copy, cloneWireOf({ server: bare, machine: null }))).toBe(false);
  });

  it('lets the linked clone be chosen with a snapshot, and without one on a host of datasets', () => {
    const copy = { ...CLONE_FORM, source: 'current' };
    expect(cloneLinks(copy, VIRTUALBOX)).toBe(false);
    expect(cloneLinks({ ...copy, snapshot: 'base' }, VIRTUALBOX)).toBe(true);
    expect(cloneLinks(copy, ZFS)).toBe(true);
  });
});

describe('cloneProblem', () => {
  const named = { ...CLONE_FORM, hostname: 'copy-1' };

  it('requires the hostname on every platform', () => {
    [VIRTUALBOX, ZFS, UTM].forEach(wire => {
      expect(cloneProblem(CLONE_FORM, { running: false, wire })).toBe(
        'machine.cloneMachineModal.hostnameRequired'
      );
      expect(cloneProblem(named, { running: true, wire })).toBe('');
    });
  });

  it('requires a snapshot for a copy of a VirtualBox machine that runs', () => {
    const copy = { ...named, source: 'current' };
    expect(cloneProblem(copy, { running: true, wire: VIRTUALBOX })).toBe(
      'machine.cloneMachineModal.snapshotRequiredWhileRunning'
    );
    expect(cloneProblem(copy, { running: false, wire: VIRTUALBOX })).toBe('');
    expect(cloneProblem({ ...copy, snapshot: 'base' }, { running: true, wire: VIRTUALBOX })).toBe(
      ''
    );
  });

  it('requires the snapshot a linked clone of VirtualBox links to', () => {
    const linked = { ...named, source: 'current', linked: true };
    expect(cloneProblem(linked, { running: false, wire: VIRTUALBOX })).toBe(
      'machine.cloneMachineModal.linkedRequiresSnapshot'
    );
  });

  it('requires no snapshot on a host of datasets, running or linked', () => {
    const linked = { ...cloneFormOf(ZFS), hostname: 'copy-1', source: 'current' };
    expect(cloneProblem(linked, { running: true, wire: ZFS })).toBe('');
    expect(cloneProblem(linked, { running: false, wire: ZFS })).toBe('');
  });
});

describe('cloneBody', () => {
  const copy = {
    source: 'current',
    snapshot: 'base',
    linked: true,
    name: 'copy',
    hostname: 'copy-1',
    domain: 'example.com',
    memory: '2G',
    vcpus: '2',
    startAfter: true,
  };

  const sent = {
    name: 'copy',
    settings: { hostname: 'copy-1', domain: 'example.com' },
    overrides: { memory: '2G', vcpus: 2 },
    source: 'current',
    start_after_create: true,
  };

  it('sends a fresh build with linked false and no snapshot on every platform', () => {
    [VIRTUALBOX, ZFS, UTM].forEach(wire => {
      expect(cloneBody({ ...cloneFormOf(wire), hostname: ' copy-1 ' }, wire)).toEqual({
        settings: { hostname: 'copy-1' },
        overrides: {},
        source: 'template',
        start_after_create: false,
        linked: false,
      });
    });
  });

  it('sends the snapshot of a VirtualBox machine under snapshot', () => {
    expect(cloneBody(copy, VIRTUALBOX)).toEqual({ ...sent, snapshot: 'base', linked: true });
    expect(cloneBody(copy, VIRTUALBOX)).not.toHaveProperty('snapshot_name');
  });

  it('sends the snapshot of a machine on a host of datasets under snapshot_name', () => {
    expect(cloneBody(copy, ZFS)).toEqual({ ...sent, snapshot_name: 'base', linked: true });
    expect(cloneBody(copy, ZFS)).not.toHaveProperty('snapshot');
  });

  it('says linked false of a VirtualBox copy made of the live state', () => {
    const live = { ...copy, snapshot: '' };
    expect(cloneBody(live, VIRTUALBOX)).toEqual({ ...sent, linked: false });
  });

  it('says linked as the box reads of a copy on a host of datasets with no snapshot picked', () => {
    const live = { ...copy, snapshot: '' };
    expect(cloneBody(live, ZFS)).toEqual({ ...sent, linked: true });
    expect(cloneBody({ ...live, linked: false }, ZFS)).toEqual({ ...sent, linked: false });
  });

  it('sends a machine on UTM no snapshot and linked false', () => {
    expect(cloneBody(copy, UTM)).toEqual({ ...sent, linked: false });
  });
});

describe('the answers of a clone', () => {
  it('reads the details of a refusal for want of resources', () => {
    const error = {
      data: {
        error: 'Insufficient resources',
        details: [{ resource: 'memory', message: 'Not enough memory' }, null, { resource: 'cpu' }],
      },
    };
    expect(resourceIssuesOf(error)).toEqual([{ resource: 'memory', message: 'Not enough memory' }]);
    expect(resourceIssuesOf({ data: { error: 'Machine not found' } })).toEqual([]);
    expect(resourceIssuesOf(null)).toEqual([]);
  });

  it('reads the warnings a queued clone answers', () => {
    const warning = { resource: 'storage', level: 'warning', message: 'Disk at 91%' };
    expect(resourceWarningsOf({ resource_warnings: [warning] })).toEqual([warning]);
    expect(resourceWarningsOf({ success: true })).toEqual([]);
  });
});

describe('the template bodies', () => {
  it('sends the machine, the file and the snapshot of an export where given', () => {
    expect(exportBody({ name: 'dev-1' })).toEqual({ machine_name: 'dev-1' });
    expect(exportBody({ name: 'web-1', filename: ' web.box ', snapshot: 'base' })).toEqual({
      machine_name: 'web-1',
      filename: 'web.box',
      snapshot_name: 'base',
    });
  });

  it('publishes only a form that names registry, organization, box and version', () => {
    expect(canPublish(PUBLISH_FORM)).toBe(false);
    const form = {
      ...PUBLISH_FORM,
      source: 'boxvault',
      organization: ' acme ',
      boxName: 'debian13',
      version: '1.0.0',
    };
    expect(canPublish(form)).toBe(true);
    expect(publishBody({ name: 'web-1', snapshot: 'base', form })).toEqual({
      machine_name: 'web-1',
      snapshot_name: 'base',
      source_name: 'boxvault',
      organization: 'acme',
      box_name: 'debian13',
      version: '1.0.0',
    });
    expect(
      publishBody({
        name: 'web-1',
        snapshot: 'base',
        form: { ...form, architecture: 'amd64', description: 'Base' },
      })
    ).toMatchObject({ architecture: 'amd64', description: 'Base' });
  });

  it('opens on the registry the host marks default, the first otherwise', () => {
    expect(defaultSourceOf([{ name: 'a' }, { name: 'b', default: true }])).toBe('b');
    expect(defaultSourceOf([{ name: 'a' }, { name: 'b' }])).toBe('a');
    expect(defaultSourceOf([])).toBe('');
    expect(
      defaultSourceOf([
        { id: 'a', name: 'Alpha' },
        { id: 'b', name: 'Beta', default: true },
      ])
    ).toBe('b');
  });
});

describe('importBody', () => {
  it('sends the path and the name where given', () => {
    expect(importBody({ path: ' /srv/box.ova ' })).toEqual({ path: '/srv/box.ova' });
    expect(importBody({ path: 'C:\\boxes\\a.ova', name: ' copy ' })).toEqual({
      path: 'C:\\boxes\\a.ova',
      name: 'copy',
    });
  });
});
