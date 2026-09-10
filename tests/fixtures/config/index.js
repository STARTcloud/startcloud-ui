export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/config/app': { status: 200, file: 'app.config.json' },
  'GET /api/config/app/schema': { status: 200, file: 'app.schema.json' },
  'PUT /api/config/app': { status: 200, file: 'put-200.json', refused: 'put-422.json' },
  'GET /api/config/restart-status': { status: 200, file: 'restart-status.json' },
  'POST /api/config/app/upload': { status: 200, file: 'upload-200.json' },
  'GET /api/setup/status': { status: 200, file: 'setup-status.json' },
  'GET /api/setup': { status: 200, file: 'setup.json' },
  'GET /api/setup/schema': { status: 200, file: 'setup-schema.json' },
};
