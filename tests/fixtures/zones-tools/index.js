export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/machines/web-1/snapshots': { status: 200, file: 'snapshots-web-1.json' },
  'GET /api/machines/web-2/snapshots': { status: 200, file: 'snapshots-web-2.json' },
  'POST /api/machines/web-1/snapshots': { status: 200, file: 'snapshot-take-200.json' },
  'PUT /api/machines/web-1/snapshots/before-upgrade': {
    status: 200,
    file: 'snapshot-modify-200.json',
  },
  'DELETE /api/machines/web-1/snapshots/before-upgrade': {
    status: 200,
    file: 'snapshot-delete-200.json',
  },
  'POST /api/machines/web-2/snapshots/daily-20260926-0300/restore': {
    status: 200,
    file: 'snapshot-restore-200.json',
  },
  'PUT /api/machines/web-1': { status: 200, file: 'policy-200.json' },
  'POST /api/machines/web-1/clone': { status: 202, file: 'clone-202.json' },
  'POST /api/templates/export': { status: 202, file: 'export-202.json' },
  'POST /api/templates/publish': { status: 202, file: 'publish-202.json' },
  'GET /api/templates/sources': { status: 200, file: 'sources-200.json' },
  'GET /api/storage/snapshot/holds': { status: 200, file: 'holds-200.json' },
  'POST /api/storage/snapshot/holds': { status: 202, file: 'hold-202.json' },
  'DELETE /api/storage/snapshot/holds': { status: 202, file: 'release-202.json' },
  'GET /api/monitoring/zones/usage': { status: 200, file: 'zone-usage.json' },
  'GET /api/monitoring/zones/diskio': { status: 200, file: 'zone-diskio.json' },
  'GET /api/monitoring/network/usage': { status: 200, file: 'network-usage.json' },
  'GET /api/tasks/b2000000-0000-4000-8000-000000000001': {
    status: 200,
    file: 'task-take-200.json',
  },
  'GET /api/tasks/b2000000-0000-4000-8000-000000000001/output': {
    status: 200,
    file: 'task-take-output-200.json',
  },
  'GET /api/tasks': { status: 200, file: 'tasks-200.json' },
};
