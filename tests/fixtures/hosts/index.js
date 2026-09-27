export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/health': { status: 200, file: 'health.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/1/stats': { status: 200, file: 'agents-1-stats.json' },
  'GET /api/agents/1/machines': { status: 200, file: 'agents-1-machines.json' },
  'POST /api/agents/1/machines/dev-2/start': { status: 200, file: 'action-200.json' },
  'POST /api/agents/1/machines/dev-1/stop': { status: 200, file: 'action-200.json' },
  'GET /api/agents/1/tasks': { status: 200, file: 'tasks-200.json' },
  'GET /api/agents/1/tasks/7f3a1c02-5b90-4e4d-8c21-d7a660e55b9f': {
    status: 200,
    file: 'task-200.json',
  },
  'GET /api/agents/1/tasks/7f3a1c02-5b90-4e4d-8c21-d7a660e55b9f/output': {
    status: 200,
    file: 'task-output-200.json',
  },
  'DELETE /api/agents/1/tasks/7f3a1c02-5b90-4e4d-8c21-d7a660e55b9f': {
    status: 200,
    file: 'task-cancel-200.json',
  },
};
