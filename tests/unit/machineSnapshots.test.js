import { describe, expect, it } from 'vitest';

import {
  TAKE_FORM,
  holdHandles,
  holdsOf,
  matchesSnapshot,
  modifyBody,
  policyBody,
  policyFormOf,
  policyOf,
  snapshotDepth,
  snapshotFlags,
  snapshotInstant,
  snapshotKey,
  takeBody,
  takeProblem,
} from '../../src/features/hosts/utils/snapshots.js';

const tree = {
  name: 'before-upgrade',
  uuid: '0a1b2c3d-0000-4000-8000-000000000001',
  description: 'Before the upgrade',
  node: 'SnapshotName-1',
  current: true,
};

const dataset = {
  name: 'daily-20260926-0300',
  description: null,
  created: '2026-09-26T03:00:00.000Z',
  datasets: 2,
  dataset_names: ['rpool/zones/web-1', 'rpool/zones/web-1/boot'],
  used_bytes: 1048576,
  holds: 2,
};

const STOPPED = { running: false, utm: false };
const RUNNING = { running: true, utm: false };

describe('a snapshot row', () => {
  it('is keyed by its uuid where the agent answers one and by its name otherwise', () => {
    expect(snapshotKey(tree)).toBe(tree.uuid);
    expect(snapshotKey(dataset)).toBe(dataset.name);
  });

  it('sits as deep as the dashes of its node', () => {
    expect(snapshotDepth({ node: 'SnapshotName' })).toBe(0);
    expect(snapshotDepth(tree)).toBe(1);
    expect(snapshotDepth({ node: 'SnapshotName-1-2' })).toBe(2);
    expect(snapshotDepth(dataset)).toBe(0);
  });

  it('carries the instant it was taken and its holds where the agent answers them', () => {
    expect(snapshotInstant(dataset)).toBe(new Date(dataset.created).getTime());
    expect(snapshotInstant(tree)).toBe(0);
    expect(holdsOf(dataset)).toBe(2);
    expect(holdsOf(tree)).toBe(0);
  });

  it('is flagged current and held', () => {
    expect(snapshotFlags(tree)).toEqual(['current']);
    expect(snapshotFlags(dataset)).toEqual(['held']);
    expect(snapshotFlags({ name: 'plain' })).toEqual([]);
  });

  it('matches the query by its name and its description', () => {
    expect(matchesSnapshot(tree, 'upgrade')).toBe(true);
    expect(matchesSnapshot(tree, 'before the')).toBe(true);
    expect(matchesSnapshot(dataset, 'daily')).toBe(true);
    expect(matchesSnapshot(dataset, 'upgrade')).toBe(false);
  });

  it('names one handle a dataset that carries it and none without datasets', () => {
    expect(holdHandles(dataset)).toEqual([
      { dataset: 'rpool/zones/web-1', snapshot: 'rpool/zones/web-1@daily-20260926-0300' },
      {
        dataset: 'rpool/zones/web-1/boot',
        snapshot: 'rpool/zones/web-1/boot@daily-20260926-0300',
      },
    ]);
    expect(holdHandles(tree)).toEqual([]);
    expect(holdHandles(null)).toEqual([]);
  });
});

describe('takeProblem', () => {
  it('requires the name of a named snapshot and the prefix of a dated one', () => {
    expect(takeProblem(TAKE_FORM, STOPPED)).toBe('machine.machineSnapshots.nameRequired');
    expect(takeProblem({ ...TAKE_FORM, name: 'base' }, STOPPED)).toBe('');
    expect(takeProblem({ ...TAKE_FORM, mode: 'prefix' }, STOPPED)).toBe(
      'machine.machineSnapshots.prefixRequired'
    );
    expect(takeProblem({ ...TAKE_FORM, mode: 'prefix', prefix: 'daily' }, STOPPED)).toBe('');
  });

  it('refuses a machine on UTM while it runs', () => {
    const form = { ...TAKE_FORM, name: 'base' };
    expect(takeProblem(form, { running: true, utm: true })).toBe(
      'machine.machineSnapshots.utmStoppedOnly'
    );
    expect(takeProblem(form, { running: false, utm: true })).toBe('');
  });
});

describe('takeBody', () => {
  it('sends the name alone of a plain named snapshot', () => {
    expect(takeBody({ ...TAKE_FORM, name: ' base ' }, STOPPED)).toEqual({ name: 'base' });
  });

  it('sends the prefix and the retention of a dated snapshot', () => {
    const form = { ...TAKE_FORM, mode: 'prefix', prefix: 'daily', retention: '7', name: 'kept' };
    expect(takeBody(form, STOPPED)).toEqual({ prefix: 'daily', retention: 7 });
    expect(takeBody({ ...form, retention: '' }, STOPPED)).toEqual({ prefix: 'daily' });
  });

  it('sends the description and the options chosen, live of a running machine alone', () => {
    const form = {
      ...TAKE_FORM,
      name: 'base',
      description: ' Before ',
      quiesce: true,
      live: true,
    };
    expect(takeBody(form, RUNNING)).toEqual({
      name: 'base',
      description: 'Before',
      quiesce: true,
      live: true,
    });
    expect(takeBody(form, STOPPED)).toEqual({ name: 'base', description: 'Before', quiesce: true });
  });

  it('sends neither option of a machine on UTM', () => {
    const form = { ...TAKE_FORM, name: 'base', quiesce: true, live: true };
    expect(takeBody(form, { running: false, utm: true })).toEqual({ name: 'base' });
  });
});

describe('modifyBody', () => {
  it('sends the members that changed alone', () => {
    expect(modifyBody({ newName: 'after', description: 'Before the upgrade' }, tree)).toEqual({
      new_name: 'after',
    });
    expect(modifyBody({ newName: '', description: 'Changed' }, tree)).toEqual({
      description: 'Changed',
    });
  });

  it('sends an emptied description empty, which clears it', () => {
    expect(modifyBody({ newName: '', description: '' }, tree)).toEqual({ description: '' });
  });

  it('answers null while nothing changed, a null description read as empty', () => {
    expect(modifyBody({ newName: '', description: 'Before the upgrade' }, tree)).toBeNull();
    expect(modifyBody({ newName: tree.name, description: 'Before the upgrade' }, tree)).toBeNull();
    expect(modifyBody({ newName: '', description: '' }, dataset)).toBeNull();
  });
});

describe('the retention policy', () => {
  it("is read from the snapshots of the machine's configuration", () => {
    const policy = { type: 'simple', keep: 12 };
    expect(policyOf({ configuration: { snapshots: policy } })).toEqual(policy);
    expect(policyOf({ configuration: {} })).toBeNull();
    expect(policyOf({ configuration: { snapshots: [] } })).toBeNull();
    expect(policyOf(null)).toBeNull();
  });

  it('opens the form on the policy held and on the agent default without one', () => {
    expect(policyFormOf(null)).toEqual({
      type: '',
      quiesce: false,
      keep: '',
      maxAgeDays: '',
      tiers: { hourly: '', daily: '', weekly: '' },
    });
    expect(
      policyFormOf({
        type: 'rotation',
        quiesce: true,
        tiers: { hourly: { keep: 12 }, weekly: { keep: 4 } },
      })
    ).toEqual({
      type: 'rotation',
      quiesce: true,
      keep: '',
      maxAgeDays: '',
      tiers: { hourly: '12', daily: '', weekly: '4' },
    });
  });

  it('sends the numbers of the chosen kind alone', () => {
    const form = {
      type: 'simple',
      quiesce: true,
      keep: '12',
      maxAgeDays: '30',
      tiers: { hourly: '6', daily: '', weekly: '' },
    };
    expect(policyBody(form)).toEqual({ type: 'simple', quiesce: true, keep: 12 });
    expect(policyBody({ ...form, type: 'age' })).toEqual({
      type: 'age',
      quiesce: true,
      max_age_days: 30,
    });
    expect(policyBody({ ...form, type: 'rotation' })).toEqual({
      type: 'rotation',
      quiesce: true,
      tiers: { hourly: { keep: 6 } },
    });
    expect(policyBody({ ...form, type: 'none' })).toEqual({ type: 'none' });
  });

  it('sends no number a field does not carry', () => {
    const form = policyFormOf(null);
    expect(policyBody({ ...form, type: 'simple' })).toEqual({ type: 'simple' });
    expect(policyBody({ ...form, type: 'rotation' })).toEqual({ type: 'rotation' });
  });
});
