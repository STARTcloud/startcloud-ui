export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/rules': { status: 200, file: 'rules.json' },
  'GET /api/user/deploy': { status: 200, file: 'deploy-200.json' },
  'PATCH /api/user/deploy': {
    status: 200,
    file: 'deploy-patch-200.json',
    refused: 'deploy-422.json',
  },
  'POST /api/auth/change-password': { status: 200, file: 'password-200.json' },
  'DELETE /api/auth/delete-account': { status: 200, file: 'delete-200.json' },
  'GET /api/organization/acme': { status: 200, file: 'organization.json' },
  'GET /api/organization/acme/users': { status: 200, file: 'users.json' },
  'GET /api/organization/acme/requests': { status: 200, file: 'requests.json' },
  'GET /api/organization/acme/stats': { status: 200, file: 'stats.json' },
  'GET /api/invitations/active/acme': { status: 200, file: 'invitations.json' },
  'POST /api/invitations/7/resend': { status: 200, file: 'resend-200.json' },
};
