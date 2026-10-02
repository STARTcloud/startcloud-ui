export default {
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/1/machines/dev-1/snapshots': { status: 200, file: 'snapshots-dev-1.json' },
  'GET /api/agents/1/machines/dev-2/snapshots': { status: 200, file: 'snapshots-dev-2.json' },
  'POST /api/agents/1/machines/dev-1/snapshots': { status: 200, file: 'snapshot-take-200.json' },
  'PUT /api/agents/1/machines/dev-1/snapshots/before-upgrade': {
    status: 200,
    file: 'snapshot-modify-200.json',
  },
  'DELETE /api/agents/1/machines/dev-1/snapshots/before-upgrade': {
    status: 200,
    file: 'snapshot-delete-200.json',
  },
  'POST /api/agents/1/machines/dev-2/snapshots/nightly/restore': {
    status: 200,
    file: 'snapshot-restore-200.json',
  },
  'PUT /api/agents/1/machines/dev-1': { status: 200, file: 'policy-200.json' },
  'POST /api/agents/1/machines/dev-1/clone': { status: 200, file: 'clone-200.json' },
  'POST /api/agents/1/machines/dev-2/clone': { status: 400, file: 'clone-400.json' },
  'POST /api/agents/1/machines/dev-2/move': { status: 200, file: 'move-200.json' },
  'POST /api/agents/1/machines/import': { status: 202, file: 'import-202.json' },
  'POST /api/agents/1/templates/export': { status: 202, file: 'export-202.json' },
  'POST /api/agents/1/templates/publish': { status: 202, file: 'publish-202.json' },
  'GET /api/agents/1/templates/sources': { status: 200, file: 'sources-200.json' },
  'GET /api/agents/1/monitoring/machines/usage': { status: 200, file: 'usage-dev-1.json' },
  'GET /api/agents/1/tasks/a1000000-0000-4000-8000-000000000001': {
    status: 200,
    file: 'task-take-200.json',
  },
  'GET /api/agents/1/tasks/a1000000-0000-4000-8000-000000000001/output': {
    status: 200,
    file: 'task-take-output-200.json',
  },
  'POST /api/agents/1/machines/dev-2/start': { status: 200, file: 'start-200.json' },
};
