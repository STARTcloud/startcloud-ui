export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/3/stats': { status: 200, file: 'agents-3-stats.json' },
  'GET /api/agents/3/machines': { status: 200, file: 'agents-3-machines.json' },
  'GET /api/agents/3/system/repositories': { status: 200, file: 'agents-3-repositories.json' },
  'POST /api/agents/3/system/repositories': { status: 202, file: 'queued-202.json' },
  'PUT /api/agents/3/system/repositories/extra.omnios': { status: 202, file: 'queued-202.json' },
  'POST /api/agents/3/system/repositories/ooce/enable': { status: 200, file: 'action-200.json' },
  'POST /api/agents/3/system/repositories/extra.omnios/disable': {
    status: 200,
    file: 'action-200.json',
  },
  'DELETE /api/agents/3/system/repositories/ooce': { status: 202, file: 'queued-202.json' },
  'GET /api/agents/1/stats': { status: 200, file: 'agents-1-stats.json' },
  'GET /api/agents/1/machines': { status: 200, file: 'agents-1-machines.json' },
  'GET /api/agents/1/system/boot-environments': {
    status: 200,
    file: 'boot-environments-empty.json',
  },
};
