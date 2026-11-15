import { describe, expect, it } from 'vitest';

import { errorKeys } from '../../src/components/common/StepUpDialog.jsx';

describe('errorKeys', () => {
  it("names the refusal's own code first and the status key after it", () => {
    const refused = { status: 409, code: 'tfa_required', messageKey: 'errors.conflict' };
    expect(errorKeys(refused)).toEqual(['errors.tfa_required', 'errors.conflict']);
    const last = { status: 409, code: 'last_method', messageKey: 'errors.conflict' };
    expect(errorKeys(last)).toEqual(['errors.last_method', 'errors.conflict']);
  });

  it('falls to the status key for a refusal without a code and to the request key for none', () => {
    expect(errorKeys({ status: 403, messageKey: 'errors.accessDenied' })).toEqual([
      'errors.',
      'errors.accessDenied',
    ]);
    expect(errorKeys({})).toEqual(['errors.', 'errors.request']);
    expect(errorKeys(null)).toEqual(['errors.', 'errors.request']);
  });
});
