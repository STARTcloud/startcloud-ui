import { describe, expect, it } from 'vitest';

import {
  copyBodyOf,
  FAMILIES,
  familyGroupsOf,
  isAccountEventKind,
  isPlainKind,
  previewDocOf,
  previewTextOf,
} from '../../src/features/identity/components/EmailTemplateDialog.jsx';

const ARGS = [
  { name: 'client_name', description: 'The application asking' },
  { name: 'approval_link', description: 'The approval link' },
];

const row = (kind, family) => ({ kind, family, copies: [] });

describe('the template families', () => {
  it('name the three families in the order the page draws them', () => {
    expect(FAMILIES).toEqual(['email', 'notification', 'sms']);
  });

  it('group the kinds by family in that order, the kinds in the order given, an empty family left out', () => {
    const rows = [
      row('sms_ciba_approval', 'sms'),
      row('magic_login', 'email'),
      row('notify_tfa_enabled', 'notification'),
      row('account_event', 'email'),
      row('notify_org_invited', 'notification'),
    ];
    expect(familyGroupsOf(rows)).toEqual([
      { family: 'email', templates: [rows[1], rows[3]] },
      { family: 'notification', templates: [rows[2], rows[4]] },
      { family: 'sms', templates: [rows[0]] },
    ]);
    expect(familyGroupsOf([row('magic_login', 'email')])).toEqual([
      { family: 'email', templates: [row('magic_login', 'email')] },
    ]);
    expect(familyGroupsOf([])).toEqual([]);
  });

  it('call every notification and sms kind plain, and of the mail kinds the six account event kinds alone', () => {
    expect(isPlainKind(row('notify_tfa_enabled', 'notification'))).toBe(true);
    expect(isPlainKind(row('sms_ciba_approval', 'sms'))).toBe(true);
    expect(isPlainKind(row('account_event', 'email'))).toBe(false);
    expect(isPlainKind(row('magic_login', 'email'))).toBe(false);
    [
      'account_event_email_changed',
      'account_event_phone_changed',
      'account_event_phone_removed',
      'account_event_app_removed',
      'account_event_contact_phone_changed',
      'account_event_password_change_required',
    ].forEach(kind => {
      expect(isPlainKind(row(kind, 'email'))).toBe(true);
      expect(isAccountEventKind(kind)).toBe(true);
    });
    expect(isAccountEventKind('account_event')).toBe(false);
    expect(isAccountEventKind('notify_email_changed')).toBe(false);
  });
});

describe('the previews', () => {
  it('fill the offered tokens with their names, escaped for the frame and as they are for the text', () => {
    const body = '<b>{{client_name}}</b> {{approval_link}} {{nmae}} {0}';
    expect(previewDocOf(body, ARGS)).toBe('<b>client_name</b> approval_link {{nmae}} {0}');
    expect(previewTextOf(body, ARGS)).toBe('<b>client_name</b> approval_link {{nmae}} {0}');
    expect(previewDocOf('{{client_name}}', [{ name: 'client_name', description: '<x>' }])).toBe(
      'client_name'
    );
    expect(previewTextOf('', ARGS)).toBe('');
    expect(previewDocOf(undefined, ARGS)).toBe('');
  });
});

describe('the text members a write carries', () => {
  const form = { site: '', locale: '', version: '1.0', subject: 'Title', body: 'Text' };

  it('carry subject and body for a mail or a notification kind', () => {
    expect(copyBodyOf(row('magic_login', 'email'), form)).toEqual({
      subject: 'Title',
      body: 'Text',
    });
    expect(copyBodyOf(row('notify_tfa_enabled', 'notification'), form)).toEqual({
      subject: 'Title',
      body: 'Text',
    });
  });

  it('carry body alone for an sms kind', () => {
    expect(copyBodyOf(row('sms_ciba_approval', 'sms'), form)).toEqual({ body: 'Text' });
    expect(Object.keys(copyBodyOf(row('sms_ciba_approval', 'sms'), form))).not.toContain('subject');
  });
});
