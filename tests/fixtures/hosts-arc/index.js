export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/3/stats': { status: 200, file: 'agents-3-stats.json' },
  'GET /api/agents/3/machines': { status: 200, file: 'agents-3-machines.json' },
  'GET /api/agents/3/system/zfs/arc/config': { status: 200, file: 'agents-3-arc-config.json' },
  'PUT /api/agents/3/system/zfs/arc/config': { status: 200, file: 'arc-apply-200.json' },
  'POST /api/agents/3/system/zfs/arc/validate': { status: 200, file: 'arc-validate-200.json' },
  'POST /api/agents/3/system/zfs/arc/reset': { status: 200, file: 'action-200.json' },
  'GET /api/agents/1/stats': { status: 200, file: 'agents-1-stats.json' },
  'GET /api/agents/1/machines': { status: 200, file: 'agents-1-machines.json' },
  'GET /api/agents/1/system/boot-environments': {
    status: 200,
    file: 'boot-environments-empty.json',
  },
};
