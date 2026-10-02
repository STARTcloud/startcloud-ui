export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/health': { status: 200, file: 'health.json' },
  'GET /api/rules': { status: 200, file: 'rules.json' },
  'GET /api/user/integrations': { status: 200, file: 'services.json' },
  'PATCH /api/user/integrations/hyperweaver': {
    status: 200,
    file: 'patch-200.json',
    refused: 'patch-422.json',
  },
  'POST /api/user/integrations/hyperweaver/connect': { status: 200, file: 'connect-200.json' },
  'DELETE /api/user/integrations/hyperweaver': { status: 204, file: 'disconnect-204.json' },
};
