export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/machines/defaults': { status: 200, file: 'defaults-200.json' },
  'GET /api/machines/ostypes': { status: 200, file: 'ostypes-200.json' },
  'PUT /api/machines/dev-2': { status: 200, file: 'modify-queued-200.json' },
  'GET /api/tasks/a1000000-0000-4000-8000-0000000000a2': {
    status: 200,
    file: 'task-modify-200.json',
  },
};
