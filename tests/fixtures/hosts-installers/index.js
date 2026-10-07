export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/3/stats': { status: 200, file: 'agents-3-stats.json' },
  'GET /api/agents/3/machines': { status: 200, file: 'agents-3-machines.json' },
  'GET /api/agents/3/artifacts/storage/paths': { status: 200, file: 'agents-3-storage-paths.json' },
  'POST /api/agents/3/artifacts/storage/paths': { status: 201, file: 'path-201.json' },
  'PUT /api/agents/3/artifacts/storage/paths/loc-iso': { status: 200, file: 'action-200.json' },
  'PUT /api/agents/3/artifacts/storage/paths/loc-installers': {
    status: 200,
    file: 'action-200.json',
  },
  'DELETE /api/agents/3/artifacts/storage/paths/loc-installers': {
    status: 202,
    file: 'queued-202.json',
  },
  'GET /api/agents/3/artifacts': { status: 200, file: 'agents-3-artifacts.json' },
  'POST /api/agents/3/artifacts/scan': { status: 202, file: 'queued-202.json' },
  'POST /api/agents/3/artifacts/download': { status: 202, file: 'queued-202.json' },
  'POST /api/agents/3/artifacts/hcl-download': { status: 202, file: 'queued-202.json' },
  'POST /api/agents/3/artifacts/register': { status: 201, file: 'register-201.json' },
  'POST /api/agents/3/artifacts/upload/prepare': { status: 200, file: 'prepare-200.json' },
  'DELETE /api/agents/3/artifacts/files': { status: 202, file: 'queued-202.json' },
  'POST /api/agents/3/artifacts/11/move': { status: 202, file: 'queued-202.json' },
  'POST /api/agents/3/artifacts/11/copy': { status: 202, file: 'queued-202.json' },
  'GET /api/agents/3/secrets': { status: 200, file: 'agents-3-secrets.json' },
  'GET /api/agents/3/provisioning/provisioners': {
    status: 200,
    file: 'agents-3-provisioners.json',
  },
  'POST /api/agents/3/provisioning/provisioners/import': { status: 202, file: 'queued-202.json' },
  'DELETE /api/agents/3/provisioning/provisioners/startcloud': {
    status: 409,
    file: 'delete-409.json',
  },
  'DELETE /api/agents/3/provisioning/provisioners/hcl-domino': {
    status: 200,
    file: 'action-200.json',
  },
  'DELETE /api/agents/3/provisioning/provisioners/hcl-domino/versions/2.0.0': {
    status: 200,
    file: 'action-200.json',
  },
  'POST /api/agents/3/provisioning/provisioners/startcloud/refresh-from-source': {
    status: 202,
    file: 'queued-202.json',
  },
  'GET /api/agents/3/provisioning/catalog': { status: 200, file: 'agents-3-catalog.json' },
  'GET /api/agents/3/provisioning/catalog/health': {
    status: 200,
    file: 'agents-3-catalog-health.json',
  },
  'GET /api/agents/3/provisioning/catalog/sources': {
    status: 200,
    file: 'agents-3-catalog-sources.json',
  },
  'POST /api/agents/3/provisioning/catalog/install': { status: 202, file: 'queued-202.json' },
};
