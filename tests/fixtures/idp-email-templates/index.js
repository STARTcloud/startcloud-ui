export default {
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/admin/email-templates': { status: 200, file: 'templates.json' },
  'GET /api/admin/email-templates/arguments': { status: 200, file: 'arguments.json' },
  'GET /api/config/sites': { status: 200, file: 'sites.json' },
  'PATCH /api/admin/email-templates/magic_login': {
    status: 404,
    file: 'gone-404.json',
    refused: 'patch-422.json',
  },
  'DELETE /api/admin/email-templates/magic_login': { status: 404, file: 'gone-404.json' },
  'POST /api/admin/email-templates/bulk': { status: 200, file: 'bulk-200.json' },
  'POST /api/admin/email-templates/magic_login/publish': {
    status: 409,
    file: 'publish-409.json',
    refused: 'publish-422.json',
  },
};
