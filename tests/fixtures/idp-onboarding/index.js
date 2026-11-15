export default {
  'GET /api/auth/onboarding': { status: 200, file: 'onboarding.json' },
  'GET /api/auth/device?user_code=ABCD-EFGH': { status: 200, file: 'device.json' },
  'GET /api/auth/device?user_code=DONE-CODE': { status: 200, file: 'device-zero.json' },
  'GET /api/auth/device?user_code=GONE-CODE': { status: 404, file: 'device-404.json' },
};
