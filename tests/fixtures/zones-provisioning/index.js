export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/machines/web-1': { status: 200, file: 'machine-web-1.json' },
  'GET /api/machines/web-1/provision/status': { status: 200, file: 'status-provisioned.json' },
  'POST /api/machines/web-1/provision': { status: 200, file: 'provision-200.json' },
  'POST /api/machines/web-1/sync': { status: 200, file: 'sync-200.json' },
  'POST /api/machines/web-1/run-provisioners': { status: 200, file: 'run-provisioners-200.json' },
  'PUT /api/machines/web-1': { status: 200, file: 'document-200.json' },
  'GET /api/machines/web-1/hosts-yml': { status: 200, file: 'hosts-yml-200.json' },
  'PUT /api/machines/web-1/hosts-yml': { status: 200, file: 'hosts-yml-put-200.json' },
  'GET /api/provisioning/provisioners': { status: 200, file: 'provisioners-200.json' },
  'GET /api/provisioning/provisioners/startcloud/versions/0.1.27': {
    status: 200,
    file: 'provisioner-version-200.json',
  },
  'GET /api/tasks/d4000000-0000-4000-8000-000000000001': {
    status: 200,
    file: 'task-provision-200.json',
  },
  'GET /api/tasks/d4000000-0000-4000-8000-000000000001/output': {
    status: 200,
    file: 'task-provision-output-200.json',
  },
};
