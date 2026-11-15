export default {
  'POST /api/servers/test': { status: 200, file: 'test-bootstrap-200.json' },
  'POST /api/servers': { status: 201, file: 'servers-post-201.json' },
  'PATCH /api/servers/1': { status: 200, file: 'servers-patch-200.json' },
};
