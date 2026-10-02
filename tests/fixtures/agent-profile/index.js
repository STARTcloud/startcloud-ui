export default {
  'GET /api/status': { status: 200, file: 'status.json' },
  'GET /api/setup/status': { status: 200, file: 'setup-status.json' },
  'GET /api/api-keys/info': { status: 200, file: 'key-info.json' },
  'GET /api/user': { status: 200, file: 'user.json' },
  'PATCH /api/user/preferences': { status: 200, file: 'preferences-200.json' },
  'GET /api/user/favorites': { status: 200, file: 'favorites.json' },
  'GET /api/notifications/unread-count': { status: 200, file: 'unread-count.json' },
  'GET /api/notifications': { status: 200, file: 'notifications.json' },
  'GET /api/notifications/vapid-key': { status: 503, file: 'vapid-key-503.json' },
};
