export default {
  'GET /api/ws-ticket': { status: 200, file: 'ws-ticket-200.json' },
  'GET /api/machines/web-1/vnc/info': { status: 200, file: 'vnc-info-200.json' },
  'POST /api/machines/web-1/vnc/start': { status: 200, file: 'vnc-start-200.json' },
  'DELETE /api/machines/web-1/vnc/stop': { status: 200, file: 'vnc-stop-200.json' },
  'GET /api/zlogin/sessions': { status: 200, file: 'zlogin-sessions-200.json' },
  'POST /api/machines/web-1/zlogin/start': { status: 200, file: 'zlogin-start-200.json' },
  'DELETE /api/zlogin/sessions/d2000000-0000-4000-8000-000000000001/stop': {
    status: 200,
    file: 'zlogin-stop-200.json',
  },
};
