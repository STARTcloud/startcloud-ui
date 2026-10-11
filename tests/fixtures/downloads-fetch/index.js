export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/user/download-watches': { status: 200, file: 'watches.json' },
  'GET /api/organization/STARTcloud/download': { status: 200, file: 'downloads.json' },
  'POST /api/organization/STARTcloud/download/pending/fetch': {
    status: 200,
    file: 'fetch-200.json',
  },
};
