export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/setup/status': { status: 200, file: 'setup-status.json' },
  'GET /api/api-keys/info': { status: 200, file: 'key-info.json' },
  'POST /api/api-keys/bootstrap': { status: 200, file: 'bootstrap-200.json' },
  'POST /api/auth/tray-claim': { status: 200, file: 'tray-claim.json' },
  'GET /api/auth/oidc/device-status': { status: 200, file: 'device-approved.json' },
  'POST /api/auth/oidc/code-start': { status: 200, file: 'code-start.json' },
  'POST /api/auth/oidc/code': { status: 200, file: 'code-exchange.json' },
  'POST /api/auth/oidc/silent-start': { status: 502, file: 'silent-unreachable-502.json' },
};
