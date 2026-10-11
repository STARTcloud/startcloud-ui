export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/user/watches': { status: 200, file: 'watches.json' },
  'GET /api/organization/STARTcloud/box/debian12-server': { status: 200, file: 'box.json' },
  'GET /api/organization/STARTcloud/box/debian12-server/version': {
    status: 200,
    file: 'versions.json',
  },
  'PUT /api/organization/STARTcloud/box/debian12-server': {
    status: 200,
    file: 'box-updated.json',
  },
};
