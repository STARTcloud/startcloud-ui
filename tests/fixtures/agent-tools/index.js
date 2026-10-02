export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/machines/dev-1/snapshots': { status: 200, file: 'snapshots-dev-1.json' },
  'POST /api/machines/dev-1/snapshots': { status: 200, file: 'snapshot-take-200.json' },
  'POST /api/machines/dev-1/clone': { status: 200, file: 'clone-current-200.json' },
  'GET /api/tasks/a1000000-0000-4000-8000-000000000001': {
    status: 200,
    file: 'task-take-200.json',
  },
  'GET /api/tasks/a1000000-0000-4000-8000-000000000001/output': {
    status: 200,
    file: 'task-take-output-200.json',
  },
};
