export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/rules': { status: 200, file: 'rules.json' },
  'GET /api/user': { status: 200, file: 'user.json' },
  'PATCH /api/user/preferences': {
    status: 200,
    file: 'preferences-200.json',
    refused: 'preferences-422.json',
  },
  'GET /api/admin/roles': { status: 200, file: 'admin-roles.json' },
  'GET /api/admin/users/43': { status: 200, file: 'admin-user-43.json' },
  'PATCH /api/admin/users/43/preferences': {
    status: 200,
    file: 'preferences-200.json',
    refused: 'preferences-422.json',
  },
  'GET /api/admin/users/43/tfa/methods': { status: 200, file: 'admin-methods-43.json' },
  'DELETE /api/admin/users/43/tfa/methods/12': { status: 204, file: 'empty-204.json' },
  'GET /api/admin/email-templates': { status: 200, file: 'email-templates.json' },
  'GET /api/admin/email-templates/arguments': { status: 200, file: 'email-arguments.json' },
  'GET /api/config/sites': { status: 200, file: 'sites.json' },
};
