export default {
  'GET /api/agents/1/api-keys': { status: 200, file: 'api-keys.json' },
  'POST /api/agents/1/api-keys/generate': { status: 201, file: 'generated-201.json' },
  'POST /api/agents/1/api-keys/bootstrap': { status: 201, file: 'bootstrap-201.json' },
  'DELETE /api/agents/1/api-keys/2': { status: 200, file: 'action-200.json' },
};
