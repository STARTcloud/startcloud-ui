import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/runtime.js', () => ({ client: {} }));

const { ApiError } = await import('../../src/lib/apiClient.js');
const { passkeyCodeOf } = await import('../../src/lib/passkeys.js');

const refusalOf = body => {
  const cause = new Error('request failed 403');
  cause.response = { status: 403, data: body, headers: {} };
  return new ApiError({ method: 'POST', url: '/login/webauthn', cause, messageKeys: {} });
};

describe('passkeyCodeOf', () => {
  it("keeps the server's own code of a refused sign-in", () => {
    expect(passkeyCodeOf(refusalOf({ status: 403, code: 'account_suspended' }))).toBe(
      'account_suspended'
    );
  });

  it('answers passkey for a refusal without a code and for a browser or ceremony failure', () => {
    expect(passkeyCodeOf(refusalOf({ status: 403 }))).toBe('passkey');
    expect(passkeyCodeOf(new Error('No credential returned'))).toBe('passkey');
    expect(passkeyCodeOf(Object.assign(new Error('invalid state'), { code: 11 }))).toBe('passkey');
    expect(passkeyCodeOf(null)).toBe('passkey');
  });
});
