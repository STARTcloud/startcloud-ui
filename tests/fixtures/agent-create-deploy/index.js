export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/templates/sources': { status: 200, file: 'sources-mirror-200.json' },
  'GET /api/provisioning/catalog/sources': { status: 200, file: 'catalog-sources-200.json' },
  'GET /api/provisioning/catalog': { status: 200, file: 'catalog-200.json' },
  'POST /api/provisioning/catalog/install': { status: 202, file: 'install-202.json' },
  'GET /api/tasks/c1000000-0000-4000-8000-000000000031': {
    status: 200,
    file: 'task-install-200.json',
  },
  'PUT /api/config/storage': {
    status: 200,
    file: 'config-put-200.json',
    refused: 'storage-refused.json',
  },
  'POST /api/machines': { status: 200, file: 'create-download-200.json' },
};
