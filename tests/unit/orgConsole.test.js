import { describe, expect, it } from 'vitest';

import { organizationUpdateOf } from '../../src/features/organizations/components/OrgConsolePage.jsx';

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
