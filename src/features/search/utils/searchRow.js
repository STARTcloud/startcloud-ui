import PropTypes from 'prop-types';

import { itemPath, providerPath, versionPath } from '../../../utils/routes';

export const SEARCH_KINDS = [
  'organization',
  'item',
  'version',
  'provider',
  'architecture',
  'artifact',
  'user',
];

export const searchRowShape = PropTypes.shape({
  kind: PropTypes.oneOf(SEARCH_KINDS).isRequired,
  collection: PropTypes.string,
  org: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  provider: PropTypes.string.isRequired,
  architecture: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  matched: PropTypes.string.isRequired,
});

export const searchAnswerShape = PropTypes.shape({
  query: PropTypes.string.isRequired,
  results: PropTypes.arrayOf(searchRowShape).isRequired,
  truncated: PropTypes.objectOf(PropTypes.number).isRequired,
});

export const collectionOfRow = (row, collections) =>
  collections.find(collection => collection.key === row.collection) || null;

/**
 * The in-app path a search row leads to: the organization page for an
 * organization, the org console or the admin board for a user, and for
 * everything else the deepest page of the row's collection the row names
 * (provider, version, else item).
 *
 * @param {Object} row - One search result row
 * @param {Array<Object>} collections - The collections the host mounts
 * @returns {string} The path
 */
export const searchRowPath = (row, collections) => {
  if (row.kind === 'organization') {
    return `/${row.org}`;
  }
  if (row.kind === 'user') {
    return row.org ? '/org-console' : '/admin';
  }
  const collection = collectionOfRow(row, collections);
  if (!collection) {
    return row.org ? `/${row.org}` : '/';
  }
  if (row.provider && collection.hasProviders) {
    return providerPath(collection, row.org, row.name, row.version, row.provider);
  }
  if (row.version && collection.hasVersions) {
    return versionPath(collection, row.org, row.name, row.version);
  }
  return itemPath(collection, row.org, row.name);
};
