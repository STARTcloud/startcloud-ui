export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/user': { status: 401, file: 'unauthorized-401.json' },
  'GET /api/auth/methods': { status: 200, file: 'methods.json' },
};
