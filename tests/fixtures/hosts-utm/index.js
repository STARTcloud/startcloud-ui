export default {
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/1/stats': { status: 200, file: 'agents-1-stats.json' },
  'GET /api/agents/1/machines': { status: 200, file: 'agents-1-machines.json' },
  'GET /api/agents/1/machines/mac-1': { status: 200, file: 'agents-1-machine-mac-1.json' },
  'GET /api/agents/1/machines/mac-1/snapshots': { status: 400, file: 'snapshots-400.json' },
};
