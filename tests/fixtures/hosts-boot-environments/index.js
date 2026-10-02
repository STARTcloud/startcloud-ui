export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/3/stats': { status: 200, file: 'agents-3-stats.json' },
  'GET /api/agents/3/machines': { status: 200, file: 'agents-3-machines.json' },
  'GET /api/agents/3/system/boot-environments': {
    status: 200,
    file: 'agents-3-boot-environments.json',
  },
  'POST /api/agents/3/system/boot-environments': { status: 202, file: 'queued-202.json' },
  'POST /api/agents/3/system/boot-environments/omnios-r151052/activate': {
    status: 202,
    file: 'queued-202.json',
  },
  'POST /api/agents/3/system/boot-environments/test-be/mount': {
    status: 202,
    file: 'queued-202.json',
  },
  'POST /api/agents/3/system/boot-environments/omnios-r151054/unmount': {
    status: 202,
    file: 'queued-202.json',
  },
  'DELETE /api/agents/3/system/boot-environments/omnios-r151052': {
    status: 202,
    file: 'queued-202.json',
  },
  'GET /api/agents/1/stats': { status: 200, file: 'agents-1-stats.json' },
  'GET /api/agents/1/machines': { status: 200, file: 'agents-1-machines.json' },
  'GET /api/agents/1/system/zfs/arc/config': { status: 200, file: 'arc-config-200.json' },
};
