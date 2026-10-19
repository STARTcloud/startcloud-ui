export default {
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/agents/1/stats': { status: 200, file: 'agents-1-stats.json' },
  'GET /api/agents/4/stats': { status: 200, file: 'agents-4-stats.json' },
  'GET /api/agents/1/app/updates/check': { status: 200, file: 'updates-check.json' },
  'POST /api/agents/1/app/updates/apply': { status: 202, file: 'update-queued-202.json' },
  'GET /api/agents/1/certs': { status: 200, file: 'certs.json' },
  'POST /api/agents/1/certs': { status: 201, file: 'cert-post-201.json' },
  'DELETE /api/agents/1/certs/sec-github': { status: 200, file: 'cert-delete-200.json' },
};
