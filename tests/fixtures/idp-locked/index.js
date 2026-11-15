export default {
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/user/tfa/methods': { status: 200, file: 'profile-methods.json' },
  'GET /api/auth/tfa': { status: 200, file: 'tfa.json' },
  'POST /api/auth/tfa/send': { status: 409, file: 'locked.json' },
  'POST /api/auth/tfa/email/verify': { status: 409, file: 'locked.json' },
  'GET /api/auth/tfa/methods': { status: 200, file: 'methods.json' },
};
