import { describe, expect, it } from 'vitest';

import {
  filtersByOrganization,
  visibleRows,
  visibleStats,
  visibleUnder,
} from '../../src/features/hosts/utils/organizations.js';

const ACME = '0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11';
const PROMINIC = '5e0e6a0c-2b55-4f0b-8d1c-91a7c3f4b622';

const owned = { id: 1, org_uuids: [ACME] };
const shared = { id: 2, org_uuids: [ACME, PROMINIC] };
const open = { id: 3, org_uuids: [] };
const bare = { id: 4 };

describe('filtersByOrganization', () => {
  it('answers true on the hyperweaver-server role that lists hosts', () => {
    expect(filtersByOrganization({ role: 'hyperweaver-server', features: ['hosts'] })).toBe(true);
  });

  it('answers false on an agent role and on a server role without the token', () => {
    expect(filtersByOrganization({ role: 'hyperweaver-agent', features: ['hosts'] })).toBe(false);
    expect(filtersByOrganization({ role: 'zoneweaver-agent', features: ['hosts'] })).toBe(false);
    expect(filtersByOrganization({ role: 'hyperweaver-server', features: [] })).toBe(false);
    expect(filtersByOrganization({ role: 'hyperweaver-server' })).toBe(false);
    expect(filtersByOrganization({ role: 'boxvault', features: ['hosts'] })).toBe(false);
  });
});

describe('visibleUnder', () => {
  it('shows every row while the choice is All', () => {
    expect(visibleUnder(owned, '')).toBe(true);
    expect(visibleUnder(open, '')).toBe(true);
    expect(visibleUnder(bare, '')).toBe(true);
  });

  it('shows a row whose list names the chosen organization', () => {
    expect(visibleUnder(owned, ACME)).toBe(true);
    expect(visibleUnder(shared, PROMINIC)).toBe(true);
  });

  it('hides a row whose list names other organizations alone', () => {
    expect(visibleUnder(owned, PROMINIC)).toBe(false);
  });

  it('fails open on an empty list, on a row without a list and on no row', () => {
    expect(visibleUnder(open, PROMINIC)).toBe(true);
    expect(visibleUnder(bare, PROMINIC)).toBe(true);
    expect(visibleUnder({ org_uuids: 'acme' }, PROMINIC)).toBe(true);
    expect(visibleUnder(null, PROMINIC)).toBe(true);
  });
});

describe('visibleRows', () => {
  const rows = [owned, shared, open, bare];

  it('answers the list itself while the choice is All', () => {
    expect(visibleRows(rows, '')).toBe(rows);
  });

  it('answers the rows that show under the chosen organization, in order', () => {
    expect(visibleRows(rows, PROMINIC).map(row => row.id)).toEqual([2, 3, 4]);
    expect(visibleRows(rows, ACME).map(row => row.id)).toEqual([1, 2, 3, 4]);
  });
});

describe('visibleStats', () => {
  const stats = {
    hostname: 'lab-1',
    allmachines: ['web-1', 'web-2', 'web-3', 'web-4'],
    runningmachines: ['web-1', 'web-2'],
  };
  const machines = [
    { name: 'web-1', org_uuids: [PROMINIC] },
    { name: 'web-2', org_uuids: [ACME] },
    { name: 'web-3', org_uuids: [] },
  ];

  it('answers the stats themselves while the choice is All', () => {
    expect(visibleStats(stats, machines, '')).toBe(stats);
  });

  it('answers what the agent answered when it answered no names', () => {
    expect(visibleStats(null, machines, PROMINIC)).toBe(null);
    const nameless = { hostname: 'lab-1' };
    expect(visibleStats(nameless, machines, PROMINIC)).toBe(nameless);
  });

  it('narrows the names to the machines under the choice, a name without a row shown', () => {
    const narrowed = visibleStats(stats, machines, PROMINIC);
    expect(narrowed.allmachines).toEqual(['web-1', 'web-3', 'web-4']);
    expect(narrowed.hostname).toBe('lab-1');
  });

  it('leaves the running names whole, the state of one machine asked by name', () => {
    expect(visibleStats(stats, machines, PROMINIC).runningmachines).toEqual(['web-1', 'web-2']);
  });

  it('shows every name while the host answered no rows', () => {
    expect(visibleStats(stats, [], PROMINIC).allmachines).toEqual(stats.allmachines);
  });
});
