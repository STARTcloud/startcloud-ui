import { publicItemsFrom } from '../../collections/provisioners';
import { fetchCatalog, fetchCatalogHealth } from '../api/provisioning';

/**
 * The adapter the host's catalog page lists through, the catalog site's
 * items read from what the host relays of one catalog source:
 * `GET provisioning/catalog` and `GET provisioning/catalog/health` with
 * `source`, a source that publishes no health drawing its families
 * unrated; no watches, no bulk actions and no item pages.
 *
 * @param {Object} options - The host and the source
 * @param {Object} options.status - The payload from `probeStatus`
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {string} options.source - The catalog source's id, empty for the default
 * @returns {Object} The adapter
 */
export const hostCatalogAdapter = ({ status, id, source }) => {
  const listAll = () =>
    Promise.all([
      fetchCatalog(status, id, source),
      fetchCatalogHealth(status, id, source).catch(() => null),
    ]).then(([catalog, health]) => publicItemsFrom({ catalog, health }));
  return {
    listAll,
    listOrg: listAll,
  };
};

/**
 * The key of one version of a family, `family/version`, the key
 * `installedKeysOf` holds for every version the host has.
 *
 * @param {string} name - The family name
 * @param {string} version - The version
 * @returns {string} The key
 */
export const versionKeyOf = (name, version) => `${name}/${version}`;
