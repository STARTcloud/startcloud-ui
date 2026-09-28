export default {
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/1/stats': { status: 200, file: 'agents-1-stats.json' },
  'GET /api/agents/1/machines': { status: 200, file: 'agents-1-machines.json' },
  'GET /api/agents/1/machines/dev-1': { status: 200, file: 'agents-1-machine-dev-1.json' },
  'GET /api/agents/1/machines/dev-2': { status: 200, file: 'agents-1-machine-dev-2.json' },
  'GET /api/agents/1/machines/dev-3': { status: 200, file: 'agents-1-machine-dev-3.json' },
  'GET /api/agents/1/machines/dev-1/guest-properties': {
    status: 200,
    file: 'guest-properties-200.json',
  },
  'GET /api/agents/1/machines/dev-1/guest/osinfo': { status: 200, file: 'guest-osinfo-200.json' },
  'GET /api/agents/1/machines/dev-1/guest/network': {
    status: 200,
    file: 'guest-network-200.json',
  },
  'POST /api/agents/1/machines/dev-3/guest-agent/setup': {
    status: 200,
    file: 'guest-setup-200.json',
  },
  'PUT /api/agents/1/machines/dev-1/tags': { status: 200, file: 'tags-200.json' },
  'PUT /api/agents/1/machines/dev-1/notes': { status: 200, file: 'notes-200.json' },
};
