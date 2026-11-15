import { describe, expect, it } from 'vitest';

import { assignmentRows } from '../../src/features/hosts/components/OrgAssignmentModal.jsx';

const ACME = '0b7c1d52-6f0e-4c0a-9a54-3c1f6f2a9e11';
const PROMINIC = '5e0e6a0c-2b55-4f0b-8d1c-91a7c3f4b622';
const UNREACHABLE = '7c3e9a10-4d2b-4f6e-b1a8-2e5d7c9f0a33';

const known = [
  { uuid: ACME, name: 'Acme', roles: ['OWNER'], primary: true },
  { uuid: PROMINIC, name: 'Prominic', roles: ['ADMIN'], primary: false },
];

describe('assignmentRows', () => {
  it('answers every known organization as it is', () => {
    expect(assignmentRows(known, [])).toEqual(known);
    expect(assignmentRows(known, [ACME])).toEqual(known);
  });

  it('keeps an assigned uuid outside the known list as a row named by the uuid', () => {
    expect(assignmentRows(known, [ACME, UNREACHABLE])).toEqual([
      ...known,
      { uuid: UNREACHABLE, name: UNREACHABLE, roles: [], primary: false },
    ]);
  });

  it('answers the assigned uuids alone while no organization is known', () => {
    expect(assignmentRows([], [UNREACHABLE]).map(row => row.uuid)).toEqual([UNREACHABLE]);
    expect(assignmentRows([], [])).toEqual([]);
  });
});
