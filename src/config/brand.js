export const POWERED_BY = { href: 'https://startcloud.com', logoSrc: '/brand/startcloud/mark.svg' };

/**
 * The brand mark: the host's `brand.logo_url`, a mark under `public/brand/`
 * that carries its own light and dark paint through `light-dark()`.
 * @param {{ logo_url: string }} brand - `status.brand`
 * @returns {string} The image path
 */
export const brandLogoUrl = brand => brand.logo_url;

/**
 * The brand wordmark, `logo.svg` in the folder of the host's `brand.logo_url`,
 * the mark and the name in the brand's own type as paths, painting its own
 * light and dark variant the same way.
 * @param {{ logo_url: string }} brand - `status.brand`
 * @returns {string} The image path
 */
export const brandWordmarkUrl = brand => brand.logo_url.replace(/[^/]*$/, 'logo.svg');
