const PATH = '7c1e5d3a-0000-4000-8000-000100000003';

export default {
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/1/artifacts/storage/paths': { status: 200, file: 'paths-200.json' },
  'POST /api/agents/1/artifacts/storage/paths': { status: 201, file: 'path-create-201.json' },
  [`PUT /api/agents/1/artifacts/storage/paths/${PATH}`]: {
    status: 200,
    file: 'path-update-200.json',
  },
  [`DELETE /api/agents/1/artifacts/storage/paths/${PATH}`]: {
    status: 200,
    file: 'path-delete-200.json',
  },
  'GET /api/agents/1/artifacts': { status: 200, file: 'artifacts-200.json' },
  'GET /api/agents/1/artifacts/9a2b4c6d-0000-4000-8000-000100000001': {
    status: 200,
    file: 'artifact-200.json',
  },
  'DELETE /api/agents/1/artifacts/files': { status: 200, file: 'delete-200.json' },
  'POST /api/agents/1/artifacts/scan': { status: 202, file: 'scan-202.json' },
  'POST /api/agents/1/artifacts/download': { status: 202, file: 'download-202.json' },
  'POST /api/agents/1/artifacts/9a2b4c6d-0000-4000-8000-000100000001/move': {
    status: 202,
    file: 'move-202.json',
  },
  'POST /api/agents/1/artifacts/9a2b4c6d-0000-4000-8000-000100000001/copy': {
    status: 202,
    file: 'copy-202.json',
  },
};
