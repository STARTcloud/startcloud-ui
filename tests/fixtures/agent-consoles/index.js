export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/ws-ticket': { status: 200, file: 'ws-ticket-200.json' },
  'GET /api/applications': { status: 200, file: 'applications-200.json' },
  'GET /api/machines/dev-1/vnc': { status: 200, file: 'vnc-200.json' },
  'POST /api/machines/dev-1/ssh/start': { status: 200, file: 'ssh-start-200.json' },
  'DELETE /api/ssh/sessions/c1000000-0000-4000-8000-000000000002/stop': {
    status: 200,
    file: 'ssh-stop-200.json',
  },
  'GET /api/machines/dev-1/rdp': { status: 200, file: 'rdp-200.json' },
  'GET /api/machines/dev-1/ftp': { status: 200, file: 'ftp-200.json' },
  'POST /api/machines/dev-1/open-directory': { status: 200, file: 'launch-200.json' },
  'POST /api/machines/dev-1/open-ftp': { status: 200, file: 'launch-200.json' },
  'POST /api/machines/dev-1/open-rdp': { status: 200, file: 'launch-200.json' },
};
