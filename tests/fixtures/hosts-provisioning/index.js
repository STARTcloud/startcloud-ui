export default {
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/1/machines/dev-1': { status: 200, file: 'machine-dev-1.json' },
  'GET /api/agents/1/machines/dev-2': { status: 200, file: 'machine-dev-2.json' },
  'GET /api/agents/1/machines/dev-1/provision/status': {
    status: 200,
    file: 'status-provisioned.json',
  },
  'GET /api/agents/1/machines/dev-2/provision/status': {
    status: 200,
    file: 'status-not-started.json',
  },
  'POST /api/agents/1/machines/dev-1/provision': { status: 200, file: 'provision-200.json' },
  'POST /api/agents/1/machines/dev-2/provision': { status: 409, file: 'provision-409.json' },
  'POST /api/agents/1/machines/dev-1/sync': { status: 200, file: 'sync-200.json' },
  'POST /api/agents/1/machines/dev-1/run-provisioners': {
    status: 200,
    file: 'run-provisioners-200.json',
  },
  'POST /api/agents/1/machines/dev-2/run-provisioners': {
    status: 200,
    file: 'run-provisioners-noop-200.json',
  },
  'PUT /api/agents/1/machines/dev-1': { status: 200, file: 'document-200.json' },
  'PUT /api/agents/1/machines/dev-2': { status: 200, file: 'document-200.json' },
  'GET /api/agents/1/machines/dev-1/hosts-yml': { status: 200, file: 'hosts-yml-200.json' },
  'GET /api/agents/1/machines/dev-2/hosts-yml': { status: 200, file: 'hosts-yml-200.json' },
  'PUT /api/agents/1/machines/dev-1/hosts-yml': { status: 200, file: 'hosts-yml-put-200.json' },
  'PUT /api/agents/1/machines/dev-2/hosts-yml': { status: 400, file: 'hosts-yml-put-400.json' },
  'GET /api/agents/1/provisioning/provisioners': { status: 200, file: 'provisioners-200.json' },
  'GET /api/agents/1/provisioning/provisioners/startcloud/versions/0.1.27': {
    status: 200,
    file: 'provisioner-version-200.json',
  },
  'GET /api/agents/1/tasks/c3000000-0000-4000-8000-000000000001': {
    status: 200,
    file: 'task-provision-200.json',
  },
  'GET /api/agents/1/tasks/c3000000-0000-4000-8000-000000000001/output': {
    status: 200,
    file: 'task-provision-output-200.json',
  },
};
