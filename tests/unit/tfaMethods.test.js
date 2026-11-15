import { describe, expect, it } from 'vitest';

import {
  buildOptions,
  keyOf,
  membersOf,
  parseKey,
  preferredKey,
  queryProblemOf,
} from '../../src/features/tfa/utils/methods.js';

const t = (key, values) => (values?.label ? `${key}:${values.label}` : key);

const statusOf = flags => ({ features: [{ tfa: flags }] });

const EVERY = statusOf(['app', 'sms', 'passkey', 'email']);

const ANSWER = {
  sms: [{ id: 12, label: 'Work phone', masked: '+1******4242' }],
  app: [{ id: 11, label: 'Phone app' }],
  passkey: true,
  backup_codes: true,
  email: true,
  locked: [],
  preferred: { method: 'SMS', authenticator_id: 12 },
  sms_risk_notice: true,
};

const keysOf = options => options.map(option => option.key);

describe('keyOf and parseKey', () => {
  it('joins a method to its authenticator and reads it back', () => {
    expect(keyOf('SMS', 12)).toBe('SMS:12');
    expect(keyOf('PASSKEY')).toBe('PASSKEY');
    expect(parseKey('SMS:12')).toEqual({ tfaMethod: 'SMS', authenticatorId: '12' });
    expect(parseKey('EMAIL')).toEqual({ tfaMethod: 'EMAIL', authenticatorId: '' });
  });
});

describe('buildOptions', () => {
  it('draws each phone, each app, a passkey, a backup code and the emailed code', () => {
    const options = buildOptions(ANSWER, EVERY, t);
    expect(keysOf(options)).toEqual(['SMS:12', 'APP:11', 'PASSKEY', 'BACKUP_CODE', 'EMAIL']);
    expect(options[0]).toMatchObject({
      label: 'tfa.method.sms:Work phone',
      help: '+1******4242',
      extra: 'tfa.method.smsRisk',
    });
  });

  it('draws a method only while its member allows it', () => {
    const answer = { ...ANSWER, sms: [], passkey: false, backup_codes: false, email: false };
    expect(keysOf(buildOptions(answer, EVERY, t))).toEqual(['APP:11']);
  });

  it('draws a phone, a passkey and the emailed code only while its sub flag is listed', () => {
    expect(keysOf(buildOptions(ANSWER, statusOf(['app']), t))).toEqual(['APP:11', 'BACKUP_CODE']);
    expect(keysOf(buildOptions(ANSWER, { features: ['tfa'] }, t))).toEqual([
      'APP:11',
      'BACKUP_CODE',
    ]);
  });

  it('draws EMAIL in locked as a locked method, disabled and last', () => {
    const answer = { ...ANSWER, email: false, locked: ['EMAIL'] };
    const options = buildOptions(answer, EVERY, t);
    expect(options.at(-1)).toMatchObject({
      key: 'EMAIL',
      disabled: true,
      help: 'tfa.method.locked',
    });
  });

  it('reads the five members of a refusal, which carry no locked list', () => {
    const members = { sms: [], app: [], passkey: false, backup_codes: true, email: true };
    expect(keysOf(buildOptions(members, EVERY, t))).toEqual(['BACKUP_CODE', 'EMAIL']);
  });
});

describe('preferredKey', () => {
  it('answers the preferred method while it is enabled', () => {
    expect(preferredKey(ANSWER, buildOptions(ANSWER, EVERY, t))).toBe('SMS:12');
  });

  it('answers the first enabled card when the preferred one is not drawn, and none without cards', () => {
    const answer = { ...ANSWER, sms: [] };
    expect(preferredKey(answer, buildOptions(answer, EVERY, t))).toBe('APP:11');
    expect(preferredKey({}, [])).toBe('');
  });
});

describe('membersOf', () => {
  const refusal = code => ({
    code,
    data: {
      code,
      status: 503,
      sms: [],
      app: [{ id: 11, label: 'Phone app' }],
      passkey: false,
      backup_codes: false,
      email: true,
    },
  });

  it('answers the five members of send_failed and of sms_unavailable', () => {
    const members = {
      sms: [],
      app: [{ id: 11, label: 'Phone app' }],
      passkey: false,
      backup_codes: false,
      email: true,
    };
    expect(membersOf(refusal('send_failed'))).toEqual(members);
    expect(membersOf(refusal('sms_unavailable'))).toEqual(members);
  });

  it('answers null for a refusal that carries no members', () => {
    expect(membersOf({ code: 'send_failed', data: { status: 503 } })).toBeNull();
    expect(membersOf({ code: 'send_failed', data: null })).toBeNull();
  });

  it('answers null for any other failure', () => {
    expect(membersOf(refusal('invalid'))).toBeNull();
    expect(membersOf(new Error('network'))).toBeNull();
    expect(membersOf(null)).toBeNull();
  });
});

describe('queryProblemOf', () => {
  it('answers the problem of an ?error= query', () => {
    expect(queryProblemOf('?error=sms_unavailable')).toEqual({
      code: 'sms_unavailable',
      status: 0,
      wait: 0,
      since: 0,
    });
  });

  it('answers null without one', () => {
    expect(queryProblemOf('?tfa_method=SMS')).toBeNull();
    expect(queryProblemOf('')).toBeNull();
  });
});
