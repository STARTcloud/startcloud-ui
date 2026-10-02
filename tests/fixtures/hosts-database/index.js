export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/3/stats': { status: 200, file: 'agents-3-stats.json' },
  'GET /api/agents/3/machines': { status: 200, file: 'agents-3-machines.json' },
  'GET /api/agents/3/system/boot-environments': {
    status: 200,
    file: 'boot-environments-empty.json',
  },
  'GET /api/agents/3/database/stats': { status: 200, file: 'agents-3-database-stats.json' },
  'GET /api/agents/3/database/monitoring/tables': {
    status: 200,
    file: 'agents-3-database-monitoring-tables.json',
  },
  'GET /api/agents/3/database/monitoring/tables/cpu_stats/rows': {
    status: 200,
    file: 'agents-3-database-rows.json',
  },
  'POST /api/agents/3/database/vacuum': { status: 200, file: 'vacuum-200.json' },
  'POST /api/agents/3/database/analyze': { status: 200, file: 'action-200.json' },
  'POST /api/agents/3/database/cleanup': { status: 200, file: 'action-200.json' },
  'GET /api/agents/1/stats': { status: 200, file: 'agents-1-stats.json' },
  'GET /api/agents/1/machines': { status: 200, file: 'agents-1-machines.json' },
  'GET /api/agents/1/system/boot-environments': {
    status: 200,
    file: 'boot-environments-empty.json',
  },
  'GET /api/agents/1/database/stats': { status: 200, file: 'agents-1-database-stats.json' },
};
