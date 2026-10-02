export const POWERED_BY = { href: 'https://startcloud.com', logoSrc: '/brand/startcloud/mark.svg' };

/**
 * The brand mark: the host's `brand.logo_url`, a mark under `public/brand/`
 * that carries its own light and dark paint through `light-dark()`.
 * @param {{ logo_url: string }} brand - `status.brand`
 * @returns {string} The image path
 */
export const brandLogoUrl = brand => brand.logo_url;

/**
 * The mark the page paints: the chosen theme's `logo` while the person
 * chose a theme the host offers and its row carries one, the pack's own
 * mark from the build's manifest, else the host's `brand.logo_url`; the
 * chrome's mark, the favicon, the About mark and the console placeholder
 * all read this one URL.
 * @param {{ logo_url: string }} brand - `status.brand`
 * @param {string} theme - The chosen theme's name, empty while none is chosen
 * @param {Array<{ name: string, logo?: string }>} themes - The themes the host offers
 * @returns {string} The image path
 */
export const brandMarkUrl = (brand, theme, themes) =>
  (theme && themes.find(entry => entry.name === theme)?.logo) || brandLogoUrl(brand);

/**
 * The brand wordmark, `logo.svg` in the folder of the host's `brand.logo_url`,
 * the mark and the name in the brand's own type as paths, painting its own
 * light and dark variant the same way.
 * @param {{ logo_url: string }} brand - `status.brand`
 * @returns {string} The image path
 */
export const brandWordmarkUrl = brand => brand.logo_url.replace(/[^/]*$/, 'logo.svg');
