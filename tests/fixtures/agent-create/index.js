export default {
  'GET /api/status': {
    status: 200,
    file: 'status.json',
  },
  'GET /api/provisioning/provisioners': {
    status: 200,
    file: 'provisioners-200.json',
  },
  'GET /api/provisioning/provisioners/startcloud/versions/0.1.27': {
    status: 200,
    file: 'version-200.json',
  },
  'GET /api/machines/defaults': {
    status: 200,
    file: 'defaults-200.json',
  },
  'GET /api/machines/ostypes': {
    status: 200,
    file: 'ostypes-200.json',
  },
  'GET /api/machines/ids/next': {
    status: 200,
    file: 'ids-next-200.json',
  },
  'GET /api/templates': {
    status: 200,
    file: 'templates-200.json',
  },
  'GET /api/templates/sources': {
    status: 200,
    file: 'sources-200.json',
  },
  'GET /api/templates/remote/boxvault': {
    status: 200,
    file: 'remote-boxvault-200.json',
  },
  'GET /api/templates/remote/mirror': {
    status: 502,
    file: 'remote-mirror-502.json',
  },
  'GET /api/artifacts': {
    status: 200,
    file: 'artifacts-200.json',
  },
  'GET /api/artifacts/iso': {
    status: 200,
    file: 'artifacts-iso-200.json',
  },
  'GET /api/media': {
    status: 200,
    file: 'media-200.json',
  },
  'GET /api/provisioning/bridged-interfaces': {
    status: 200,
    file: 'bridged-200.json',
  },
  'GET /api/network/ip-suggestions': {
    status: 200,
    file: 'ip-suggestions-200.json',
  },
  'POST /api/machines': {
    status: 200,
    file: 'create-200.json',
  },
  'GET /api/tasks/a1000000-0000-4000-8000-000000000007': {
    status: 200,
    file: 'task-create-200.json',
  },
  'GET /api/tasks/a1000000-0000-4000-8000-000000000007/output': {
    status: 200,
    file: 'task-create-output-200.json',
  },
};
