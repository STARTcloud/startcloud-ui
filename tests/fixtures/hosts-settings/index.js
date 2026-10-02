export default {
  'GET /api/agents/1/machines/defaults': { status: 200, file: 'defaults-200.json' },
  'GET /api/agents/1/machines/ostypes': { status: 200, file: 'ostypes-200.json' },
  'GET /api/agents/1/artifacts/iso': { status: 200, file: 'artifacts-iso-200.json' },
  'GET /api/agents/1/provisioning/bridged-interfaces': {
    status: 200,
    file: 'bridged-interfaces-200.json',
  },
  'PUT /api/agents/1/machines/dev-1': { status: 200, file: 'modify-accrued-200.json' },
  'PUT /api/agents/1/machines/dev-2': { status: 200, file: 'modify-queued-200.json' },
  'POST /api/agents/1/machines/dev-1/stop': { status: 200, file: 'stop-200.json' },
  'GET /api/agents/1/tasks/a1000000-0000-4000-8000-0000000000a1': {
    status: 200,
    file: 'task-modify-200.json',
  },
  'GET /api/agents/1/tasks/a1000000-0000-4000-8000-0000000000a1/output': {
    status: 200,
    file: 'task-modify-output-200.json',
  },
  'GET /api/agents/1/system/usb': { status: 200, file: 'usb-200.json' },
  'GET /api/agents/1/machines/dev-1/usb/filters': { status: 200, file: 'usb-filters-200.json' },
  'POST /api/agents/1/machines/dev-1/guestcontrol/run': {
    status: 200,
    file: 'guestcontrol-200.json',
  },
  'POST /api/agents/1/machines/dev-1/display': { status: 200, file: 'display-200.json' },
  'GET /api/servers/1/machines/dev-1/orgs': { status: 200, file: 'machine-orgs-200.json' },
  'PUT /api/servers/1/machines/dev-1/orgs': { status: 200, file: 'machine-orgs-put-200.json' },
  'GET /api/organizations': { status: 200, file: 'organizations-200.json' },
  'GET /api/userinfo/claims': { status: 200, file: 'claims-200.json' },
};
