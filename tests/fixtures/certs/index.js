export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/user': { status: 200, file: 'user.json' },
  'GET /api/servers': { status: 200, file: 'servers.json' },
  'GET /api/certs?organization=acme': { status: 200, file: 'certs-acme.json' },
  'GET /api/certs?organization=prominic': { status: 200, file: 'certs-prominic.json' },
  'POST /api/certs': { status: 201, file: 'cert-post-201.json' },
  'DELETE /api/certs/row-root': { status: 200, file: 'cert-delete-200.json' },
  'DELETE /api/certs/row-leaf': { status: 200, file: 'cert-delete-200.json' },
  'DELETE /api/certs/row-own': { status: 200, file: 'cert-delete-200.json' },
};
