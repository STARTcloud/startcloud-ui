import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/runtime.js', () => ({
  client: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const { client } = await import('../../src/lib/runtime.js');
const { issuerOrganizations: adminOrganizations, issuerUsers } =
  await import('../../src/features/identity/api/accounts.js');
const { issuerOrganizations } = await import('../../src/features/organizations/api/issuer.js');

const ACME = '0d6b7e2a-1111-4c0a-9a1e-000000000001';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('issuerUsers', () => {
  it('suspends with `enabled: false` and resumes with `enabled: true` through the record patch', async () => {
    client.patch.mockResolvedValue({});
    await issuerUsers.suspend(43);
    await issuerUsers.resume(43);
    expect(client.patch).toHaveBeenNthCalledWith(1, '/api/admin/users/43', { enabled: false });
    expect(client.patch).toHaveBeenNthCalledWith(2, '/api/admin/users/43', { enabled: true });
  });
});

describe('the admin organizations adapter', () => {
  it('suspends and resumes one row through the bulk route with that one id', async () => {
    client.post.mockResolvedValue({ processed: 1, skipped: 0, errors: [] });
    await adminOrganizations.suspend(3);
    await adminOrganizations.resume(3);
    expect(client.post).toHaveBeenNthCalledWith(1, '/api/admin/organizations/bulk', {
      action: 'suspend',
      organization_ids: [3],
    });
    expect(client.post).toHaveBeenNthCalledWith(2, '/api/admin/organizations/bulk', {
      action: 'resume',
      organization_ids: [3],
    });
  });

  it('rejects with the code of the row the bulk route skipped', async () => {
    client.post.mockResolvedValue({
      processed: 0,
      skipped: 1,
      errors: [{ id: 3, code: 'personal' }],
    });
    await expect(adminOrganizations.suspend(3)).rejects.toMatchObject({ code: 'personal' });
  });
});

describe('the organizations adapter', () => {
  it('writes one seat through PUT …/members/{userId}/suspended', async () => {
    client.put.mockResolvedValue(null);
    await issuerOrganizations.memberSuspended(ACME, 7, true);
    expect(client.put).toHaveBeenCalledWith(`/api/user/organizations/${ACME}/members/7/suspended`, {
      suspended: true,
    });
  });

  it('sends a selection through one POST …/members/bulk and answers the result', async () => {
    const answer = { processed: 2, skipped: 1, errors: [{ id: 1, code: 'own_membership' }] };
    client.post.mockResolvedValue(answer);
    await expect(issuerOrganizations.membersBulk(ACME, 'suspend', [1, 2, 3])).resolves.toBe(answer);
    expect(client.post).toHaveBeenCalledWith(`/api/user/organizations/${ACME}/members/bulk`, {
      action: 'suspend',
      user_ids: [1, 2, 3],
    });
  });
});
