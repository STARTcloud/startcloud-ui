import axios from 'axios';
import PropTypes from 'prop-types';
import { createContext, useContext } from 'react';

import { sortShape } from '../utils/itemShape';

const StatusContext = createContext(null);

/**
 * The hosting backend's answer to `GET /api/status`, asked of the origin
 * that served the page before anything is rendered: `role` names the host,
 * `version` is the backend's own version, `brand`, `auth`, `idp`,
 * `analytics`, `collections`, `organization`, `sorts`, `groups`,
 * `config`, `events`, `features`, `links` and `ticket` carry the rest of
 * the status contract.
 *
 * @returns {Promise<Object>} The status payload
 */
export const probeStatus = () => axios.get('/api/status').then(({ data }) => data);

const DEFAULT_THEME = 'startcloud';

/**
 * The build's theme manifest, `public/themes/themes.json`, written by the
 * theme generator from every theme's YAML: one row per theme, `name`,
 * `css`, `label`, `description`, `brand` and `logo`; an empty list when
 * the file is missing or malformed, so a host without themes boots as it
 * did.
 *
 * @returns {Promise<Array<Object>>} The rows
 */
export const fetchThemeManifest = () =>
  axios
    .get('/themes/themes.json')
    .then(({ data }) => (Array.isArray(data) ? data : []))
    .catch(() => []);

const hostThemeOf = (brand, manifest) => {
  if (brand?.theme && typeof brand.theme === 'object') {
    return brand.theme;
  }
  return manifest.find(row => row.name === DEFAULT_THEME) || null;
};

const offeredOf = (themes, manifest) => {
  if (!Array.isArray(themes)) {
    return manifest;
  }
  if (manifest.length === 0) {
    return themes;
  }
  const rows = new Map(manifest.map(row => [row.name, row]));
  return themes.flatMap(theme =>
    rows.has(theme.name) ? [{ ...theme, ...rows.get(theme.name) }] : []
  );
};

/**
 * The status with the host's own theme and the themes it offers completed
 * from the build's manifest: `brand.theme` stays the host's own
 * `{ name, css }` while it names one, and is the manifest's `startcloud`
 * row, the default theme, while the host names none, a stale host's bare
 * string there being no theme; a host whose `brand.themes` is absent or
 * not a list offers every theme of the build in the manifest's order, an
 * empty list offers none, and a list offers exactly those names, the
 * host naming which themes a person may choose and the theme itself
 * supplying its label, description, brand and mark, so no host carries a
 * theme's words; a name the manifest does not hold is dropped, because a
 * build cannot paint a theme it does not ship and a site config can run
 * ahead of the build it serves, the host's rows kept as they are only
 * while the manifest could not be read at all.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Array<Object>} manifest - The rows from `fetchThemeManifest`
 * @returns {Object} The status, its `brand.theme` and `brand.themes` completed
 */
export const withThemeManifest = (status, manifest) => {
  const brand = status?.brand;
  const hostTheme = hostThemeOf(brand, manifest);
  return {
    ...status,
    brand: {
      ...brand,
      ...(hostTheme ? { theme: hostTheme } : {}),
      themes: offeredOf(brand?.themes, manifest),
    },
  };
};

export const statusShape = PropTypes.shape({
  role: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  brand: PropTypes.shape({
    name: PropTypes.string.isRequired,
    logo_url: PropTypes.string.isRequired,
    repo: PropTypes.string,
    changelog: PropTypes.string,
    theme: PropTypes.shape({
      name: PropTypes.string.isRequired,
      css: PropTypes.string.isRequired,
    }),
    themes: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        css: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        description: PropTypes.string,
        brand: PropTypes.string,
        logo: PropTypes.string,
      })
    ),
  }),
  auth: PropTypes.arrayOf(PropTypes.string),
  analytics: PropTypes.shape({
    script_url: PropTypes.string.isRequired,
    attribute: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  }),
  idp: PropTypes.shape({
    issuer: PropTypes.string.isRequired,
    client_id: PropTypes.string.isRequired,
    scopes: PropTypes.string.isRequired,
    storage_prefix: PropTypes.string.isRequired,
  }),
  collections: PropTypes.arrayOf(PropTypes.string),
  organization: PropTypes.string,
  sorts: PropTypes.objectOf(PropTypes.objectOf(sortShape)),
  groups: PropTypes.objectOf(PropTypes.objectOf(PropTypes.string)),
  config: PropTypes.arrayOf(PropTypes.string),
  events: PropTypes.shape({
    path: PropTypes.string.isRequired,
    topics: PropTypes.arrayOf(PropTypes.string).isRequired,
  }),
  features: PropTypes.arrayOf(PropTypes.string),
  links: PropTypes.shape({
    docs: PropTypes.string.isRequired,
    contact: PropTypes.string.isRequired,
    api: PropTypes.string,
    community: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        url: PropTypes.string.isRequired,
      })
    ),
  }),
  ticket: PropTypes.shape({
    base_url: PropTypes.string.isRequired,
    req_type: PropTypes.string.isRequired,
    fallback_customer_id: PropTypes.string,
    context: PropTypes.string,
  }),
});

export const StatusProvider = ({ status, children }) => (
  <StatusContext.Provider value={status}>{children}</StatusContext.Provider>
);

StatusProvider.propTypes = {
  status: statusShape.isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * The status payload the app booted with.
 *
 * @returns {Object} The payload from `probeStatus`
 */
export const useStatus = () => useContext(StatusContext);
