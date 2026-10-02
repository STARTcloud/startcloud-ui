export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/3/stats': { status: 200, file: 'agents-3-stats.json' },
  'GET /api/agents/3/host/devices': { status: 200, file: 'agents-3-devices.json' },
  'GET /api/agents/3/host/devices/available': {
    status: 200,
    file: 'agents-3-devices-available.json',
  },
  'GET /api/agents/3/host/devices/categories': {
    status: 200,
    file: 'agents-3-devices-categories.json',
  },
  'GET /api/agents/3/host/ppt-status': { status: 200, file: 'agents-3-ppt-status.json' },
  'POST /api/agents/3/host/devices/refresh': { status: 200, file: 'refresh-200.json' },
};
