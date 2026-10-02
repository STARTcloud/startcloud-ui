import { describe, expect, it } from 'vitest';

import { failedAfter, shownSrc } from '../../src/components/common/useFallbackSrc.js';
import { brandLogoUrl, brandMarkUrl, brandWordmarkUrl } from '../../src/config/brand.js';

const brand = { logo_url: '/brand/startcloud/mark.svg' };
const themes = [
  {
    name: 'shi',
    css: '/themes/shi/shi.css',
    label: 'Super.Human.Installer',
    logo: '/brand/shi/mark.svg',
  },
  { name: 'lcars', css: '/themes/lcars/lcars.css', label: 'LCARS' },
];

describe('brandLogoUrl', () => {
  it('answers the host mark and the wordmark beside it', () => {
    expect(brandLogoUrl(brand)).toBe('/brand/startcloud/mark.svg');
    expect(brandWordmarkUrl(brand)).toBe('/brand/startcloud/logo.svg');
  });
});

describe('brandMarkUrl', () => {
  it('answers the chosen pack logo while the chosen pack carries one', () => {
    expect(brandMarkUrl(brand, 'shi', themes)).toBe('/brand/shi/mark.svg');
  });

  it('answers brand.logo_url while the chosen pack carries no logo', () => {
    expect(brandMarkUrl(brand, 'lcars', themes)).toBe('/brand/startcloud/mark.svg');
  });

  it('answers brand.logo_url while no theme is chosen or the name is not offered', () => {
    expect(brandMarkUrl(brand, '', themes)).toBe('/brand/startcloud/mark.svg');
    expect(brandMarkUrl(brand, 'prominic', themes)).toBe('/brand/startcloud/mark.svg');
    expect(brandMarkUrl(brand, 'shi', [])).toBe('/brand/startcloud/mark.svg');
  });
});

describe('useFallbackSrc', () => {
  const fallback = '/brand/startcloud/mark.svg';
  const logo = '/brand/shi/mark.svg';

  it('shows the pack logo until it fails, then the host mark once', () => {
    expect(shownSrc(logo, fallback, '')).toBe(logo);
    const failed = failedAfter(logo, fallback, '');
    expect(failed).toBe(logo);
    expect(shownSrc(logo, fallback, failed)).toBe(fallback);
  });

  it('never loops: a failing host mark after the swap changes nothing', () => {
    const failed = failedAfter(logo, fallback, '');
    expect(failedAfter(logo, fallback, failed)).toBe(failed);
    expect(shownSrc(logo, fallback, failed)).toBe(fallback);
  });

  it('leaves a failing host mark as it is while no pack logo is chosen', () => {
    expect(failedAfter(fallback, fallback, '')).toBe('');
    expect(shownSrc(fallback, fallback, '')).toBe(fallback);
  });

  it('shows a newly chosen pack logo after an earlier one failed', () => {
    const failed = failedAfter(logo, fallback, '');
    expect(shownSrc('/brand/lcars/mark.svg', fallback, failed)).toBe('/brand/lcars/mark.svg');
  });
});
