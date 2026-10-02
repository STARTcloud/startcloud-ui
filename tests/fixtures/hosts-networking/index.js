export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/1/monitoring/network/ipaddresses': {
    status: 200,
    file: 'agents-1-ipaddresses.json',
  },
  'GET /api/agents/3/monitoring/network/ipaddresses': {
    status: 200,
    file: 'agents-3-ipaddresses.json',
  },
  'GET /api/agents/3/monitoring/network/routes': { status: 200, file: 'agents-3-routes.json' },
  'GET /api/agents/3/monitoring/network/usage': {
    status: 200,
    file: 'agents-3-network-usage.json',
  },
  'GET /api/agents/4/stats': { status: 200, file: 'agents-4-stats.json' },
};
