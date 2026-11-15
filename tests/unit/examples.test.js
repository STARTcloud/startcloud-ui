import { describe, expect, it } from 'vitest';

import { EMAIL_ARGUMENTS, EMAIL_TEMPLATES } from '../../src/features/identity/utils/examples.js';

const TOKEN = /\{\{(?<name>[^{}]*)\}\}/g;

const tokensOf = text => [...text.matchAll(TOKEN)].map(match => match.groups.name);

const offeredBy = kind =>
  (EMAIL_ARGUMENTS.find(entry => entry.kind === kind)?.arguments || []).map(entry => entry.name);

describe('the email template examples', () => {
  it('name every token as { name, description } with no index', () => {
    EMAIL_ARGUMENTS.forEach(entry => {
      entry.arguments.forEach(argument => {
        expect(Object.keys(argument)).toEqual(['name', 'description']);
        expect(argument.name).toMatch(/^[a-z][a-z0-9_]*$/);
      });
    });
  });

  it('offer tokens for every kind that has copies and for no other', () => {
    expect(EMAIL_ARGUMENTS.map(entry => entry.kind)).toEqual(
      EMAIL_TEMPLATES.map(template => template.kind)
    );
  });

  it('list the seventeen kinds in the order the asks name them', () => {
    expect(EMAIL_TEMPLATES.map(template => template.kind)).toEqual([
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
    ]);
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
});
