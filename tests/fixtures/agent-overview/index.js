export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/stats': { status: 200, file: 'stats.json' },
  'GET /api/monitoring/status': { status: 200, file: 'monitoring-status.json' },
  'GET /api/monitoring/health': { status: 200, file: 'monitoring-health.json' },
  'GET /api/monitoring/summary': { status: 200, file: 'monitoring-summary.json' },
  'GET /api/monitoring/network/interfaces': { status: 200, file: 'interfaces.json' },
  'GET /api/monitoring/network/usage': { status: 200, file: 'network-usage.json' },
  'GET /api/monitoring/system/cpu': { status: 200, file: 'cpu.json' },
  'GET /api/monitoring/system/memory': { status: 200, file: 'memory.json' },
  'GET /api/system/swap/summary': { status: 200, file: 'swap.json' },
  'GET /api/provisioning/status': { status: 200, file: 'provisioning.json' },
};
