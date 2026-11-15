export default {
  'GET /api/auth/tfa': { status: 200, file: 'tfa.json' },
  'POST /api/auth/tfa/send': { status: 409, file: 'sms-unavailable.json' },
};
