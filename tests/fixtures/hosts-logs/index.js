export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/3/stats': { status: 200, file: 'agents-3-stats.json' },
  'GET /api/agents/3/machines': { status: 200, file: 'agents-3-machines.json' },
  'GET /api/agents/3/system/syslog/config': { status: 200, file: 'agents-3-syslog-config.json' },
  'PUT /api/agents/3/system/syslog/config': { status: 200, file: 'action-200.json' },
  'GET /api/agents/3/system/syslog/facilities': {
    status: 200,
    file: 'agents-3-syslog-facilities.json',
  },
  'POST /api/agents/3/system/syslog/validate': { status: 200, file: 'syslog-validate-200.json' },
  'POST /api/agents/3/system/syslog/reload': { status: 200, file: 'action-200.json' },
  'POST /api/agents/3/system/syslog/switch': { status: 200, file: 'action-200.json' },
  'GET /api/agents/3/system/logs/list': { status: 200, file: 'agents-3-logs-list.json' },
  'GET /api/agents/3/system/logs/messages': { status: 200, file: 'agents-3-log-messages.json' },
  'GET /api/agents/3/system/logs/fault-manager/faults': {
    status: 200,
    file: 'agents-3-log-faults.json',
  },
  'POST /api/agents/3/system/logs/messages/stream/start': {
    status: 200,
    file: 'stream-start-200.json',
  },
  'DELETE /api/agents/3/system/logs/stream/log-1759050000000/stop': {
    status: 200,
    file: 'action-200.json',
  },
  'GET /api/agents/3/ws-ticket': { status: 200, file: 'ws-ticket-200.json' },
  'GET /api/agents/1/stats': { status: 200, file: 'agents-1-stats.json' },
  'GET /api/agents/1/machines': { status: 200, file: 'agents-1-machines.json' },
  'GET /api/agents/1/system/fault-management/faults': { status: 200, file: 'faults-empty.json' },
  'GET /api/agents/1/system/fault-management/config': { status: 200, file: 'faults-empty.json' },
};
