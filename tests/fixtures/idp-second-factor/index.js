export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/user/tfa/methods': { status: 200, file: 'profile-methods.json' },
  'GET /api/auth/onboarding': { status: 200, file: 'onboarding.json' },
  'GET /api/auth/tfa/methods': { status: 200, file: 'methods.json' },
  'GET /api/auth/tfa': { status: 200, file: 'tfa-sms.json' },
  'POST /api/auth/tfa/email/send': { status: 200, file: 'email-send.json' },
  'POST /api/auth/tfa/email/verify': { status: 200, file: 'email-next.json' },
};
