import { describe, expect, it } from 'vitest';

import {
  passwordBodyOf,
  passwordRefusalOf,
} from '../../src/features/profile/utils/serverAccount.js';

describe('passwordBodyOf', () => {
  it('sends the current password, the new one and its confirmation', () => {
    expect(passwordBodyOf({ current_password: 'old', password: 'new' })).toEqual({
      current_password: 'old',
      new_password: 'new',
      confirm_password: 'new',
    });
  });

  it('sends an empty current password while the form carried none', () => {
    expect(passwordBodyOf({ password: 'new' }).current_password).toBe('');
  });
});

describe('passwordRefusalOf', () => {
  it('moves /new_password and /confirm_password onto the form fields and leaves the rest', () => {
    const error = {
      status: 422,
      fieldErrors: [
        { pointer: '/new_password', rule: 'minLength', params: { minLength: 15 } },
        { pointer: '/confirm_password', rule: 'equals', params: {} },
        { pointer: '/current_password', rule: 'required', params: {} },
      ],
    };
    expect(passwordRefusalOf(error)).toBe(error);
    expect(error.fieldErrors.map(entry => entry.pointer)).toEqual([
      '/password',
      '/confirm',
      '/current_password',
    ]);
    expect(error.fieldErrors[0].rule).toBe('minLength');
  });

  it('leaves an error without field errors as it is', () => {
    const error = { status: 403, code: 'bad_password' };
    expect(passwordRefusalOf(error)).toBe(error);
    expect(error.fieldErrors).toBeUndefined();
  });
});
