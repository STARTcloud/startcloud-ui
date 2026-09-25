export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/config/app': { status: 200, file: 'app.config.json' },
  'GET /api/config/app/schema': { status: 200, file: 'app.schema.json' },
  'PUT /api/config/app': { status: 200, file: 'put-200.json', refused: 'put-422.json' },
  'GET /api/config/restart-status': { status: 200, file: 'restart-status.json' },
};
