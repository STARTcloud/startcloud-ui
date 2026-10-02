export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/host/devices': { status: 200, file: 'devices.json' },
  'GET /api/host/devices/available': { status: 200, file: 'devices-available.json' },
  'GET /api/host/devices/categories': { status: 200, file: 'devices-categories.json' },
  'GET /api/host/ppt-status': { status: 200, file: 'ppt-status.json' },
  'POST /api/host/devices/refresh': { status: 200, file: 'refresh-200.json' },
};
