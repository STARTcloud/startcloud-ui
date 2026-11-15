const ACME = '/api/user/organizations/0d6b7e2a-1111-4c0a-9a1e-000000000001';

export default {
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/user/organizations': { status: 200, file: 'organizations.json' },
  [`PUT ${ACME}/members/7/suspended`]: { status: 204, file: 'empty-204.json' },
  [`PUT ${ACME}/members/8/suspended`]: { status: 204, file: 'empty-204.json' },
  [`POST ${ACME}/members/bulk`]: { status: 200, file: 'members-bulk-200.json' },
  'GET /api/admin/roles': { status: 200, file: 'admin-roles.json' },
  'GET /api/admin/users': { status: 200, file: 'admin-users.json' },
  'GET /api/admin/users/42': { status: 200, file: 'admin-user-42.json' },
  'PATCH /api/admin/users/43': { status: 200, file: 'admin-user-43.json' },
  'PATCH /api/admin/users/44': { status: 200, file: 'admin-user-44.json' },
  'GET /api/admin/organizations': { status: 200, file: 'admin-organizations.json' },
  'POST /api/admin/organizations/bulk': { status: 200, file: 'admin-organizations-bulk-200.json' },
};
