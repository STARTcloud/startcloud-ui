import { describe, expect, it } from 'vitest';

import { timeLeftOf, userCodeOf } from '../../src/components/common/DeviceCodeTimer.jsx';

describe('userCodeOf', () => {
  it('answers the user_code of an /activate path', () => {
    expect(userCodeOf('/activate?user_code=ABCD-EFGH')).toBe('ABCD-EFGH');
    expect(userCodeOf('/activate?error=x&user_code=ABCD-EFGH#top')).toBe('ABCD-EFGH');
  });

  it('answers empty for /activate without a user_code', () => {
    expect(userCodeOf('/activate')).toBe('');
    expect(userCodeOf('/activate?error=invalid_user_code')).toBe('');
  });

  it('answers empty for any other path and for none', () => {
    expect(userCodeOf('/user/profile?user_code=ABCD-EFGH')).toBe('');
    expect(userCodeOf('/activated?user_code=ABCD-EFGH')).toBe('');
    expect(userCodeOf('')).toBe('');
    expect(userCodeOf(null)).toBe('');
  });
});

describe('timeLeftOf', () => {
  it('draws seconds as minutes and two-digit seconds', () => {
    expect(timeLeftOf(212)).toBe('3:32');
    expect(timeLeftOf(65)).toBe('1:05');
    expect(timeLeftOf(59)).toBe('0:59');
    expect(timeLeftOf(0)).toBe('0:00');
  });
});
