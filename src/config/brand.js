export const POWERED_BY = { href: 'https://startcloud.com', logoSrc: '/startcloud-logo40.png' };

const DARK_LOGOS = { '/brand/boxvault.svg': '/brand/boxvault-dark.svg' };

/**
 * The brand mark for a theme: the host's `brand.logoUrl`, or the dark
 * variant this build ships beside it under `public/brand/` when there is
 * one and the theme is dark.
 * @param {{ logoUrl: string }} brand - `status.brand`
 * @param {string} theme - The resolved theme, 'light' or 'dark'
 * @returns {string} The image path
 */
export const brandLogoUrl = (brand, theme) =>
  (theme === 'dark' && DARK_LOGOS[brand.logoUrl]) || brand.logoUrl;
