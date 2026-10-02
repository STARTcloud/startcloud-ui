export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/1/stats': { status: 200, file: 'agents-1-stats.json' },
  'GET /api/agents/1/machines': { status: 200, file: 'agents-1-machines.json' },
  'GET /api/agents/1/templates': { status: 200, file: 'agents-1-templates.json' },
  'GET /api/agents/1/templates/sources': { status: 200, file: 'agents-1-sources.json' },
  'GET /api/agents/1/templates/remote/boxvault': {
    status: 200,
    file: 'agents-1-remote-boxvault.json',
  },
  'POST /api/agents/1/templates/pull': { status: 202, file: 'queued-202.json' },
  'POST /api/agents/1/templates/export': { status: 202, file: 'queued-202.json' },
  'POST /api/agents/1/templates/publish': { status: 202, file: 'queued-202.json' },
  'DELETE /api/agents/1/templates/tpl-2': { status: 202, file: 'queued-202.json' },
  'POST /api/agents/1/templates/tpl-1/move': { status: 202, file: 'queued-202.json' },
  'GET /api/agents/1/config/storage': { status: 200, file: 'agents-1-config-storage.json' },
  'PUT /api/agents/1/config/storage': { status: 200, file: 'config-saved-200.json' },
  'GET /api/agents/1/machines/orchestration/status': {
    status: 200,
    file: 'agents-1-orchestration-status.json',
  },
  'GET /api/agents/1/machines/priorities': { status: 200, file: 'agents-1-priorities.json' },
};
