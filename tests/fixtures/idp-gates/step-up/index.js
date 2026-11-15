export default {
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/user/tfa/methods': { status: 200, file: 'methods.json' },
  'PUT /api/user/tfa': { status: 403, file: 'step-up-required.json' },
};
