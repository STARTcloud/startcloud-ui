export default {
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/1/ws-ticket': { status: 200, file: 'ws-ticket-200.json' },
  'GET /api/agents/1/machines/dev-1/vnc': { status: 200, file: 'vnc-200.json' },
  'GET /api/agents/1/machines/dev-2/vnc': { status: 200, file: 'vnc-off-200.json' },
  'GET /api/agents/1/machines/dev-1/vnc/info': { status: 200, file: 'vnc-info-200.json' },
  'GET /api/agents/1/machines/dev-2/vnc/info': { status: 200, file: 'vnc-info-200.json' },
  'GET /api/agents/1/machines/dev-1/vnc/screenshot': { status: 502, file: 'screenshot-502.json' },
  'POST /api/agents/1/machines/dev-1/ssh/start': { status: 200, file: 'ssh-start-200.json' },
  'DELETE /api/agents/1/ssh/sessions/c1000000-0000-4000-8000-000000000001/stop': {
    status: 200,
    file: 'ssh-stop-200.json',
  },
  'GET /api/agents/1/machines/dev-1/rdp': { status: 200, file: 'rdp-200.json' },
  'GET /api/agents/1/machines/dev-1/ftp': { status: 200, file: 'ftp-200.json' },
};
