export default {
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/1/stats': { status: 200, file: 'agents-1-stats.json' },
  'GET /api/agents/1/machines': { status: 200, file: 'agents-1-machines.json' },
  'GET /api/agents/1/machines/8617--switchboard.m4kr.net': {
    status: 200,
    file: 'agents-1-machine-8617.json',
  },
  'GET /api/agents/1/monitoring/status': { status: 200, file: 'monitoring-status.json' },
  'GET /api/agents/1/monitoring/network/interfaces': {
    status: 200,
    file: 'agents-1-interfaces.json',
  },
  'GET /api/agents/1/monitoring/network/ipaddresses': {
    status: 200,
    file: 'agents-1-ipaddresses.json',
  },
  'GET /api/agents/1/monitoring/network/usage': {
    status: 200,
    file: 'agents-1-network-usage.json',
  },
  'GET /api/agents/1/monitoring/machines/usage': {
    status: 200,
    file: 'agents-1-machines-usage.json',
  },
  'GET /api/agents/1/network/spaces': { status: 200, file: 'agents-1-spaces.json' },
  'GET /api/agents/3/stats': { status: 200, file: 'agents-3-stats.json' },
  'GET /api/agents/3/machines': { status: 200, file: 'agents-3-machines.json' },
  'GET /api/agents/3/machines/4001--fw-os-n1.home.m4kr.net': {
    status: 200,
    file: 'agents-3-machine-4001.json',
  },
  'GET /api/agents/3/monitoring/status': { status: 200, file: 'monitoring-status.json' },
  'GET /api/agents/3/monitoring/network/interfaces': {
    status: 200,
    file: 'agents-3-interfaces.json',
  },
  'GET /api/agents/3/monitoring/network/usage': {
    status: 200,
    file: 'agents-3-network-usage.json',
  },
  'GET /api/agents/3/network/vnics': { status: 200, file: 'agents-3-vnics.json' },
  'GET /api/agents/3/network/etherstubs': { status: 200, file: 'agents-3-etherstubs.json' },
  'GET /api/agents/3/network/aggregates': { status: 200, file: 'agents-3-aggregates.json' },
};
