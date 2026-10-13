export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/health': { status: 200, file: 'health.json' },
  'GET /api/rules': { status: 200, file: 'rules.json' },
  'GET /api/config/grafana': { status: 200, file: 'grafana.json' },
  'GET /api/config/ticket': { status: 200, file: 'ticket.json' },
  'GET /api/vdi/fleet': { status: 200, file: 'fleet.json' },
  'GET /api/vdi/pools': { status: 200, file: 'pools.json' },
  'GET /api/vdi/vms/i-0a1b2c3d': { status: 200, file: 'vm-i-0a1b2c3d.json' },
  'GET /api/vdi/vms/i-0a1b2c3d/history': { status: 200, file: 'history.json' },
  'GET /api/vdi/vms/i-0a1b2c3d/stats': { status: 200, file: 'stats.json' },
};
