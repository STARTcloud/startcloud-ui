export default {
  'GET /api/config/places': { status: 403, file: 'second-factor-required.json' },
  'GET /api/auth/tfa': { status: 200, file: 'tfa.json' },
};
