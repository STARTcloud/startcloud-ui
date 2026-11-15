export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/user': { status: 403, file: 'second-factor-required.json' },
  'GET /api/auth/tfa': { status: 200, file: 'tfa.json' },
  'GET /api/auth/tfa/methods': { status: 200, file: 'methods.json' },
};
