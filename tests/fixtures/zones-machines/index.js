export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/machines': { status: 200, file: 'machines.json' },
  'GET /api/machines/web-1': { status: 200, file: 'machine-web-1.json' },
  'GET /api/machines/web-2': { status: 200, file: 'machine-web-2.json' },
  'GET /api/machines/web-1/guest/osinfo': { status: 200, file: 'guest-osinfo-200.json' },
  'GET /api/machines/web-1/guest/network': { status: 200, file: 'guest-network-200.json' },
  'PUT /api/machines/web-1/tags': { status: 200, file: 'tags-200.json' },
  'PUT /api/machines/web-1/notes': { status: 200, file: 'notes-200.json' },
  'POST /api/machines/web-2/start': { status: 200, file: 'queued-200.json' },
};
