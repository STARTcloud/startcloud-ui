export default {
  'GET /api/admin/email-templates': { status: 200, file: 'templates.json' },
  'GET /api/admin/email-templates/arguments': { status: 200, file: 'arguments.json' },
  'PATCH /api/admin/email-templates/sms_ciba_approval': {
    status: 200,
    file: 'sms-row.json',
    refused: 'sms-422.json',
  },
  'PATCH /api/admin/email-templates/notify_org_join_requested': {
    status: 200,
    file: 'notify-row.json',
  },
  'PATCH /api/admin/email-templates/account_event_email_changed': {
    status: 200,
    file: 'plain-row.json',
  },
};
