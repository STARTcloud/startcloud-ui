export default {
  'GET /api/auth/accounts': { status: 200, file: 'accounts.json' },
  'POST /api/auth/accounts/pX3/choose': { status: 200, file: 'choose-200.json' },
  'POST /api/auth/accounts/rQ9/choose': { status: 200, file: 'choose-200.json' },
  'POST /api/auth/accounts/add': { status: 200, file: 'add-200.json' },
  'DELETE /api/auth/accounts/pX3': { status: 200, file: 'delete-active-200.json' },
  'DELETE /api/auth/accounts/rQ9': { status: 204, file: 'empty-204.json' },
  'DELETE /api/auth/accounts': { status: 200, file: 'delete-all-200.json' },
};
