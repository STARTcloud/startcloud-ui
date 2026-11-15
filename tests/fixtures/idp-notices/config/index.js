export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/config/application': { status: 200, file: 'application.config.json' },
  'GET /api/config/application/schema': { status: 200, file: 'application.schema.json' },
  'PUT /api/config/application': { status: 200, file: 'put-200.json' },
  'GET /api/config/sites': { status: 200, file: 'sites.config.json' },
  'GET /api/config/sites/schema': { status: 200, file: 'sites.schema.json' },
  'PUT /api/config/sites': { status: 200, file: 'put-200.json' },
};
