import { describe, expect, it } from 'vitest';

import {
  organizationUpdateOf,
  statRowsOf,
} from '../../src/features/organizations/components/OrgConsolePage.jsx';

const FORM = {
  organization: 'acme',
  email: 'team@acme.example',
  description: 'The Acme team',
  base_domain: ' machines.example.com ',
  access_mode: 'private',
  default_role: 'member',
};

describe('organizationUpdateOf', () => {
  it('sends base_domain trimmed on a host that lists hosts, null while blank, and never without hosts', () => {
    expect(organizationUpdateOf(FORM, true)).toEqual({
      organization: 'acme',
      email: 'team@acme.example',
      description: 'The Acme team',
      base_domain: 'machines.example.com',
    });
    expect(organizationUpdateOf({ ...FORM, base_domain: '  ' }, true).base_domain).toBeNull();
    expect(organizationUpdateOf(FORM, false)).toEqual({
      organization: 'acme',
      email: 'team@acme.example',
      description: 'The Acme team',
    });
  });
});

describe('statRowsOf', () => {
  it('answers the members and invitations rows in the drawn order', () => {
    expect(
      statRowsOf({
        total_users: 12,
        active_users: 10,
        admin_users: 3,
        invitations: { total: 4, pending: 2, accepted: 1, expired: 1 },
      })
    ).toEqual({
      members: [
        ['total', 12],
        ['active', 10],
        ['admins', 3],
      ],
      invitations: [
        ['total', 4],
        ['pending', 2],
        ['accepted', 1],
        ['expired', 1],
      ],
    });
  });

  it('leaves a member the answer lacks out and answers null for no answer', () => {
    expect(statRowsOf({ total_users: 2 })).toEqual({ members: [['total', 2]], invitations: [] });
    expect(statRowsOf(null)).toBeNull();
    expect(statRowsOf(undefined)).toBeNull();
  });
});
