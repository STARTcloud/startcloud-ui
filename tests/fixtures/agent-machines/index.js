export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/machines': { status: 200, file: 'machines.json' },
  'GET /api/machines/dev-1': { status: 200, file: 'machine-dev-1.json' },
  'GET /api/machines/dev-2': { status: 200, file: 'machine-dev-2.json' },
  'GET /api/machines/dev-1/guest-properties': { status: 200, file: 'guest-properties-200.json' },
  'GET /api/machines/dev-1/guest/osinfo': { status: 200, file: 'guest-osinfo-200.json' },
  'GET /api/machines/dev-1/guest/network': { status: 200, file: 'guest-network-200.json' },
  'PUT /api/machines/dev-1/tags': { status: 200, file: 'tags-200.json' },
  'PUT /api/machines/dev-1/notes': { status: 200, file: 'notes-200.json' },
  'POST /api/machines/dev-2/start': { status: 200, file: 'action-200.json' },
  'POST /api/machines/dev-1/stop': { status: 200, file: 'stop-200.json' },
};
