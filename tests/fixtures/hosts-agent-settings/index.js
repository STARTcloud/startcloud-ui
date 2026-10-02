export default {
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/1/stats': { status: 200, file: 'agents-1-stats.json' },
  'GET /api/agents/4/stats': { status: 200, file: 'agents-4-stats.json' },
  'GET /api/agents/1/app/updates/check': { status: 200, file: 'updates-check.json' },
  'POST /api/agents/1/app/updates/apply': { status: 202, file: 'update-queued-202.json' },
  'GET /api/agents/1/secrets': { status: 200, file: 'secrets.json' },
  'PUT /api/agents/1/secrets': { status: 200, file: 'action-200.json' },
};
