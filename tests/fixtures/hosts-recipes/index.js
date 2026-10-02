export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/3/stats': { status: 200, file: 'agents-3-stats.json' },
  'GET /api/agents/3/machines': { status: 200, file: 'agents-3-machines.json' },
  'GET /api/agents/3/provisioning/recipes': { status: 200, file: 'agents-3-recipes.json' },
  'POST /api/agents/3/provisioning/recipes': { status: 201, file: 'recipe-201.json' },
  'PUT /api/agents/3/provisioning/recipes/r-1': { status: 200, file: 'action-200.json' },
  'PUT /api/agents/3/provisioning/recipes/r-2': { status: 200, file: 'action-200.json' },
  'DELETE /api/agents/3/provisioning/recipes/r-2': { status: 200, file: 'action-200.json' },
  'POST /api/agents/3/provisioning/recipes/r-1/test': { status: 200, file: 'recipe-test-200.json' },
  'GET /api/agents/3/provisioning/network/status': {
    status: 200,
    file: 'agents-3-network-status.json',
  },
  'POST /api/agents/3/provisioning/network/setup': { status: 202, file: 'queued-202.json' },
  'DELETE /api/agents/3/provisioning/network/teardown': { status: 202, file: 'queued-202.json' },
  'GET /api/agents/3/machines/orchestration/status': {
    status: 200,
    file: 'agents-3-orchestration-status.json',
  },
  'GET /api/agents/3/machines/priorities': { status: 200, file: 'agents-3-priorities.json' },
};
