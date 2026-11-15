import { describe, expect, it } from 'vitest';

import { EMAIL_ARGUMENTS, EMAIL_TEMPLATES } from '../../src/features/identity/utils/examples.js';

const TOKEN = /\{\{(?<name>[^{}]*)\}\}/g;

const tokensOf = text => [...text.matchAll(TOKEN)].map(match => match.groups.name);

const offeredBy = kind =>
  (EMAIL_ARGUMENTS.find(entry => entry.kind === kind)?.arguments || []).map(entry => entry.name);

const MAIL_KINDS = [
  'account_verification',
  'password_reset',
  'magic_login',
  'onboarding_verification',
  'org_invite',
  'email_change',
  'account_event',
  'ciba_approval',
  'admin_new_registration',
  'account_suspended',
  'org_membership_suspended',
  'smtp_test',
  'sign_in_notice',
  'device_approval_notice',
  'ciba_approval_notice',
  'sign_in_notice_changed',
  'sign_in_email_code',
];

const PLAIN_MAIL_KINDS = [
  'account_event_email_changed',
  'account_event_phone_changed',
  'account_event_phone_removed',
  'account_event_app_removed',
  'account_event_contact_phone_changed',
  'account_event_password_change_required',
];

const NOTIFICATION_KINDS = [
  'notify_tfa_method_disabled',
  'notify_session_revoked',
  'notify_backup_codes_generated',
  'notify_tfa_enabled',
  'notify_tfa_disabled',
  'notify_sessions_revoked_all',
  'notify_password_changed',
  'notify_app_access_revoked',
  'notify_app_permission_removed',
  'notify_tos_updated',
  'notify_org_role_changed',
  'notify_org_invited',
  'notify_org_deleted',
  'notify_org_ownership_transferred',
  'notify_org_join_requested',
  'notify_org_join_approved',
  'notify_org_join_denied',
  'notify_email_changed',
  'notify_phone_changed',
  'notify_phone_removed',
  'notify_app_removed',
  'notify_contact_phone_changed',
  'notify_passkey_added',
  'notify_passkey_removed',
  'notify_password_change_required',
  'notify_ciba_approval',
];

const SMS_KINDS = ['sms_ciba_approval'];

const familyOf = kind => EMAIL_TEMPLATES.find(template => template.kind === kind)?.family;

describe('the email template examples', () => {
  it('name every token as { name, description } with no index', () => {
    EMAIL_ARGUMENTS.forEach(entry => {
      entry.arguments.forEach(argument => {
        expect(Object.keys(argument)).toEqual(['name', 'description']);
        expect(argument.name).toMatch(/^[a-z][a-z0-9_]*$/);
        expect(argument.description).toBeTruthy();
      });
    });
  });

  it('offer tokens for every kind that has copies and for no other, with the same family', () => {
    expect(EMAIL_ARGUMENTS.map(entry => entry.kind)).toEqual(
      EMAIL_TEMPLATES.map(template => template.kind)
    );
    expect(EMAIL_ARGUMENTS.map(entry => entry.family)).toEqual(
      EMAIL_TEMPLATES.map(template => template.family)
    );
  });

  it('list the fifty kinds in the order the asks name them', () => {
    expect(EMAIL_TEMPLATES.map(template => template.kind)).toEqual([
      ...MAIL_KINDS,
      ...PLAIN_MAIL_KINDS,
      ...NOTIFICATION_KINDS,
      ...SMS_KINDS,
    ]);
  });

  it('carry a family on every row, email for every mail kind, notification and sms for the rest', () => {
    EMAIL_TEMPLATES.forEach(template => {
      expect(['email', 'notification', 'sms']).toContain(template.family);
    });
    [...MAIL_KINDS, ...PLAIN_MAIL_KINDS].forEach(kind => expect(familyOf(kind)).toBe('email'));
    NOTIFICATION_KINDS.forEach(kind => expect(familyOf(kind)).toBe('notification'));
    SMS_KINDS.forEach(kind => expect(familyOf(kind)).toBe('sms'));
  });

  it('offer the sign-in notice kinds and the sign-in email code their tokens by name', () => {
    const notice = [
      'name',
      'time',
      'ip',
      'location',
      'browser',
      'method',
      'site_name',
      'sessions_link',
      'support_email',
    ];
    expect(offeredBy('sign_in_notice')).toEqual(notice);
    expect(offeredBy('device_approval_notice')).toEqual([...notice, 'client_name']);
    expect(offeredBy('ciba_approval_notice')).toEqual([...notice, 'client_name']);
    expect(offeredBy('sign_in_notice_changed')).toEqual([
      'name',
      'when',
      'channels',
      'site_name',
      'support_email',
    ]);
    expect(offeredBy('sign_in_email_code')).toEqual([
      'name',
      'code',
      'expiry_minutes',
      'site_name',
      'support_email',
    ]);
  });

  it('offer the join request notice and the sign-in text message the tokens the identity provider names', () => {
    expect(offeredBy('notify_org_join_requested')).toEqual(['person_name', 'organization_name']);
    expect(offeredBy('sms_ciba_approval')).toEqual(['client_name', 'approval_link']);
  });

  it('use in every subject and body only the tokens their kind offers', () => {
    EMAIL_TEMPLATES.forEach(template => {
      const offered = offeredBy(template.kind);
      template.copies.forEach(copy => {
        const used = [...tokensOf(copy.subject), ...tokensOf(copy.body)];
        expect(used.length).toBeGreaterThan(0);
        expect(used.filter(name => !offered.includes(name))).toEqual([]);
        expect(`${copy.subject}${copy.body}`).not.toMatch(/\{\d+\}/);
      });
    });
  });

  it('write every plain kind without HTML, an sms copy with an empty subject and a notice within its limits', () => {
    const plain = EMAIL_TEMPLATES.filter(
      template => template.family !== 'email' || PLAIN_MAIL_KINDS.includes(template.kind)
    );
    expect(plain.map(template => template.kind)).toEqual([
      ...PLAIN_MAIL_KINDS,
      ...NOTIFICATION_KINDS,
      ...SMS_KINDS,
    ]);
    plain.forEach(template => {
      template.copies.forEach(copy => {
        expect(`${copy.subject}${copy.body}`).not.toMatch(/<[a-z]/);
        if (template.family === 'sms') {
          expect(copy.subject).toBe('');
        }
        if (template.family === 'notification') {
          expect(copy.subject.length).toBeLessThanOrEqual(255);
          expect(copy.body.length).toBeLessThanOrEqual(1000);
        }
      });
    });
  });
});
