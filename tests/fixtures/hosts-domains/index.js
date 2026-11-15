export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/rules': { status: 200, file: 'rules.json' },
  'GET /api/user/preferences': { status: 200, file: 'preferences-200.json' },
  'PATCH /api/user/preferences': { status: 200, file: 'preferences-patch-200.json' },
  'GET /api/organization/acme': { status: 200, file: 'organization.json' },
  'PUT /api/organization/acme': { status: 200, file: 'organization-put-200.json' },
  'GET /api/organization/acme/users': { status: 200, file: 'users.json' },
  'GET /api/organization/acme/requests': { status: 200, file: 'requests.json' },
  'GET /api/invitations/active/acme': { status: 200, file: 'invitations.json' },
  'GET /api/agents/1/machines/defaults': { status: 200, file: 'defaults-200.json' },
};
