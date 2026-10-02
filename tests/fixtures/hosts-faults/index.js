export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/3/stats': { status: 200, file: 'agents-3-stats.json' },
  'GET /api/agents/3/machines': { status: 200, file: 'agents-3-machines.json' },
  'GET /api/agents/3/system/fault-management/faults': {
    status: 200,
    file: 'agents-3-faults.json',
  },
  'GET /api/agents/3/system/fault-management/config': {
    status: 200,
    file: 'agents-3-fault-config.json',
  },
  'POST /api/agents/3/system/fault-management/actions/acquit': {
    status: 200,
    file: 'fault-action-200.json',
  },
  'POST /api/agents/3/system/fault-management/actions/repaired': {
    status: 200,
    file: 'fault-action-200.json',
  },
  'POST /api/agents/3/system/fault-management/actions/replaced': {
    status: 200,
    file: 'fault-action-200.json',
  },
  'GET /api/agents/1/stats': { status: 200, file: 'agents-1-stats.json' },
  'GET /api/agents/1/machines': { status: 200, file: 'agents-1-machines.json' },
  'GET /api/agents/1/system/boot-environments': {
    status: 200,
    file: 'boot-environments-empty.json',
  },
};
