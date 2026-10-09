export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/health': { status: 200, file: 'health.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/1/stats': { status: 200, file: 'agents-1-stats.json' },
  'GET /api/agents/3/stats': { status: 200, file: 'agents-3-stats.json' },
  'GET /api/agents/1/provisioning/provisioners': { status: 200, file: 'provisioners-200.json' },
  'GET /api/agents/1/provisioning/catalog': { status: 200, file: 'catalog-200.json' },
  'GET /api/agents/1/provisioning/catalog/health': {
    status: 200,
    file: 'catalog-health-200.json',
  },
  'GET /api/agents/1/provisioning/catalog/sources': {
    status: 200,
    file: 'catalog-sources-200.json',
  },
  'POST /api/agents/1/provisioning/catalog/install': { status: 202, file: 'queued-202.json' },
  'GET /api/agents/1/templates': { status: 200, file: 'templates-200.json' },
  'GET /api/agents/1/templates/sources': { status: 200, file: 'sources-200.json' },
  'GET /api/agents/1/templates/remote/boxvault': { status: 200, file: 'remote-boxvault-200.json' },
  'POST /api/agents/1/templates/pull': { status: 202, file: 'queued-202.json' },
  'PUT /api/agents/1/config/storage': { status: 200, file: 'config-saved-200.json' },
};
