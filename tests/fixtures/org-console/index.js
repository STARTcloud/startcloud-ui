export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/organization/acme': { status: 200, file: 'organization.json' },
  'GET /api/organization/acme/users': { status: 200, file: 'users.json' },
  'GET /api/organization/acme/requests': { status: 200, file: 'requests.json' },
  'GET /api/invitations/active/acme': { status: 200, file: 'invitations.json' },
};
