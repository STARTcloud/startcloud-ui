export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/machines/dev-1': { status: 200, file: 'machine-dev-1.json' },
  'GET /api/machines/dev-1/provision/status': { status: 200, file: 'status-provisioned.json' },
  'POST /api/machines/dev-1/provision': { status: 200, file: 'provision-200.json' },
  'POST /api/machines/dev-1/sync': { status: 200, file: 'sync-200.json' },
};
