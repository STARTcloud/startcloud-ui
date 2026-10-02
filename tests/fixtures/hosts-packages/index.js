export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/3/stats': { status: 200, file: 'agents-3-stats.json' },
  'GET /api/agents/3/system/packages': { status: 200, file: 'agents-3-packages.json' },
  'GET /api/agents/3/system/packages/search': {
    status: 200,
    file: 'agents-3-packages-search.json',
  },
  'GET /api/agents/3/system/packages/info': { status: 200, file: 'agents-3-package-info.json' },
  'POST /api/agents/3/system/packages/install': { status: 202, file: 'queued-202.json' },
  'POST /api/agents/3/system/packages/uninstall': { status: 202, file: 'queued-202.json' },
  'GET /api/agents/3/system/updates/check': { status: 200, file: 'agents-3-updates-check.json' },
  'GET /api/agents/3/system/updates/history': {
    status: 200,
    file: 'agents-3-updates-history.json',
  },
};
