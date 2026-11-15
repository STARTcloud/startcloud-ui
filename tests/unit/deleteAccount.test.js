import { describe, expect, it } from 'vitest';

import {
  deletionBodyOf,
  deletionCheckOf,
} from '../../src/features/profile/components/security/DeleteAccountSection.jsx';

const EMAIL = 'mark@example.com';

describe('deletionCheckOf', () => {
  it('asks the typed address and the understanding box without a keyword', () => {
    const draft = { keyword: '', email: EMAIL, confirmation: '', understood: false, word: '' };
    expect(deletionCheckOf(draft)).toEqual({
      key: 'profile.security.delete.mismatch',
      params: { email: EMAIL },
    });
    expect(deletionCheckOf({ ...draft, confirmation: EMAIL })).toEqual({
      key: 'profile.security.delete.tick',
      params: {},
    });
    expect(deletionCheckOf({ ...draft, confirmation: EMAIL, understood: true })).toBeNull();
  });

  it('asks the keyword typed exactly with a keyword, the address and the box unread', () => {
    const draft = { keyword: 'DELETE', email: EMAIL, confirmation: '', understood: false };
    expect(deletionCheckOf({ ...draft, word: 'delete' })).toEqual({
      key: 'pages.confirm.typeToConfirm',
      params: { keyword: 'DELETE' },
    });
    expect(deletionCheckOf({ ...draft, word: 'DELETE' })).toBeNull();
  });
});

describe('deletionBodyOf', () => {
  it('answers the password and the word as the wire body with a keyword', () => {
    expect(
      deletionBodyOf({ keyword: 'DELETE', confirmation: '', password: 'secret', word: 'DELETE' })
    ).toEqual({ password: 'secret', confirm_text: 'DELETE' });
  });

  it('answers the typed address without one', () => {
    expect(deletionBodyOf({ keyword: '', confirmation: EMAIL, password: '', word: '' })).toBe(
      EMAIL
    );
  });
});
