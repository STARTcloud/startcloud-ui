export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/health': { status: 200, file: 'health.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/1/stats': { status: 200, file: 'agents-1-stats.json' },
  'GET /api/agents/1/machines': { status: 200, file: 'agents-1-machines.json' },
  'POST /api/agents/1/machines/dev-2/start': { status: 200, file: 'action-200.json' },
  'POST /api/agents/1/machines/dev-1/stop': { status: 200, file: 'action-200.json' },
};
