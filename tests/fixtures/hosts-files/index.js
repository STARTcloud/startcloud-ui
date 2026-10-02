export default {
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/1/filesystem': { status: 200, file: 'filesystem-200.json' },
  'POST /api/agents/1/filesystem/folder': { status: 200, file: 'folder-200.json' },
  'PATCH /api/agents/1/filesystem/rename': { status: 200, file: 'rename-200.json' },
  'DELETE /api/agents/1/filesystem': { status: 200, file: 'delete-200.json' },
  'POST /api/agents/1/filesystem/copy': { status: 202, file: 'copy-202.json' },
  'PUT /api/agents/1/filesystem/move': { status: 202, file: 'move-202.json' },
  'GET /api/agents/1/filesystem/content': { status: 200, file: 'content-200.json' },
  'PUT /api/agents/1/filesystem/content': { status: 200, file: 'content-put-200.json' },
  'POST /api/agents/1/filesystem/archive/create': { status: 202, file: 'archive-create-202.json' },
  'POST /api/agents/1/filesystem/archive/extract': {
    status: 202,
    file: 'archive-extract-202.json',
  },
  'PATCH /api/agents/1/filesystem/permissions': { status: 200, file: 'permissions-200.json' },
  'GET /api/agents/1/system/users': { status: 200, file: 'users-200.json' },
  'GET /api/agents/1/system/groups': { status: 200, file: 'groups-200.json' },
};
