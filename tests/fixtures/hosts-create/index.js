export default {
  'GET /api/servers': {
    status: 200,
    file: 'servers.json',
  },
  'GET /api/agents/1/provisioning/provisioners': {
    status: 200,
    file: 'provisioners-200.json',
  },
  'GET /api/agents/1/provisioning/provisioners/startcloud/versions/0.1.27': {
    status: 200,
    file: 'version-200.json',
  },
  'GET /api/agents/1/machines/defaults': {
    status: 200,
    file: 'defaults-200.json',
  },
  'GET /api/agents/1/machines/ostypes': {
    status: 200,
    file: 'ostypes-200.json',
  },
  'GET /api/agents/1/machines/ids/next': {
    status: 200,
    file: 'ids-next-200.json',
  },
  'GET /api/agents/1/templates': {
    status: 200,
    file: 'templates-200.json',
  },
  'GET /api/agents/1/templates/sources': {
    status: 200,
    file: 'sources-200.json',
  },
  'GET /api/agents/1/templates/remote/boxvault': {
    status: 200,
    file: 'remote-boxvault-200.json',
  },
  'GET /api/agents/1/templates/remote/mirror': {
    status: 502,
    file: 'remote-mirror-502.json',
  },
  'GET /api/agents/1/artifacts': {
    status: 200,
    file: 'artifacts-200.json',
  },
  'GET /api/agents/1/artifacts/iso': {
    status: 200,
    file: 'artifacts-iso-200.json',
  },
  'GET /api/agents/1/media': {
    status: 200,
    file: 'media-200.json',
  },
  'GET /api/agents/1/provisioning/bridged-interfaces': {
    status: 200,
    file: 'bridged-200.json',
  },
  'GET /api/agents/1/network/ip-suggestions': {
    status: 200,
    file: 'ip-suggestions-200.json',
  },
  'POST /api/agents/1/machines': {
    status: 200,
    file: 'create-200.json',
  },
  'GET /api/organizations': {
    status: 200,
    file: 'organizations-200.json',
  },
  'GET /api/userinfo/claims': {
    status: 200,
    file: 'claims-200.json',
  },
  'GET /api/boxvault/api/discover': {
    status: 200,
    file: 'boxvault-discover-200.json',
  },
  'POST /api/boxvault/api/organization/startcloud/box/debian13/version/13.1.0/provider/virtualbox/architecture/amd64/file/get-download-link':
    {
      status: 200,
      file: 'download-link-200.json',
    },
  'GET /api/agents/1/machines/unattended/detect': {
    status: 200,
    file: 'detect-200.json',
  },
  'POST /api/agents/1/machines/dev-2/unattended': {
    status: 202,
    file: 'unattended-202.json',
  },
  'GET /api/agents/1/tasks/a1000000-0000-4000-8000-000000000007': {
    status: 200,
    file: 'task-create-200.json',
  },
  'GET /api/agents/1/tasks/a1000000-0000-4000-8000-000000000007/output': {
    status: 200,
    file: 'task-create-output-200.json',
  },
};
