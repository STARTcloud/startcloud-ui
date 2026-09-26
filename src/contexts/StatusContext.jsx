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

/**
 * The build's pack manifest, `public/themes/packs.json`, written by the
 * theme generator from every pack's YAML: one row per pack, `name`,
 * `css`, `label`, `description`, `brand` and `logo`; an empty list when
 * the file is missing or malformed, so a host without packs boots as it
 * did.
 *
 * @returns {Promise<Array<Object>>} The rows
 */
export const fetchPackManifest = () =>
  axios
    .get('/themes/packs.json')
    .then(({ data }) => (Array.isArray(data) ? data : []))
    .catch(() => []);

/**
 * The status with every pack the host offers completed from the build's
 * manifest by name, the host naming which packs a person may choose and
 * the pack itself supplying its label, description, brand and mark, so
 * no host carries a pack's words; a name the manifest does not hold keeps
 * the host's row as it is.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {Array<Object>} manifest - The rows from `fetchPackManifest`
 * @returns {Object} The status, its `brand.packs` completed
 */
export const withPackManifest = (status, manifest) => {
  const packs = status?.brand?.packs;
  if (!Array.isArray(packs)) {
    return status;
  }
  const rows = new Map(manifest.map(row => [row.name, row]));
  return {
    ...status,
    brand: { ...status.brand, packs: packs.map(pack => ({ ...pack, ...rows.get(pack.name) })) },
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
    theme: PropTypes.oneOf(['light', 'dark']),
    pack: PropTypes.shape({
      name: PropTypes.string.isRequired,
      css: PropTypes.string.isRequired,
    }),
    packs: PropTypes.arrayOf(
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
