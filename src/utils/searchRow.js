import PropTypes from 'prop-types';

import { itemPath, providerPath, versionPath } from './routes';

export const SEARCH_KINDS = [
  'organization',
  'item',
  'version',
  'provider',
  'architecture',
  'artifact',
  'user',
  'application',
  'identity-provider',
  'terms',
  'notification',
  'session',
  'login',
  'registration',
  'blocked-address',
];

export const searchRowShape = PropTypes.shape({
  kind: PropTypes.string.isRequired,
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

const narrowed = (path, key, value) => `${path}?${key}=${encodeURIComponent(value)}`;

const configItem = (file, key) => `/admin/config/${file}#${encodeURIComponent(key)}`;

const ISSUER_PATHS = {
  organization: ({ admin, row }) =>
    admin ? narrowed('/admin/organizations', 'search', row.org) : '/user/organizations',
  user: ({ row }) => narrowed('/admin/users', 'search', row.name),
  application: ({ admin, row }) => (admin ? configItem('clients', row.name) : '/user/applications'),
  'identity-provider': ({ admin, row }) =>
    admin ? configItem('providers', row.name) : '/user/profile/security',
  terms: ({ admin, row }) =>
    admin ? '/admin/terms' : `/public/policies/${encodeURIComponent(row.name)}`,
  notification: () => '/notifications',
  session: ({ admin }) => (admin ? '/admin/sessions' : '/user/profile/sessions'),
  login: ({ row }) => narrowed('/admin/logins', 'username', row.name),
  registration: ({ row }) => narrowed('/admin/registrations', 'username', row.name),
  'blocked-address': () => '/admin/brute-force',
};

/**
 * The in-app path a search row leads to: on the `auth-server` role the page
 * the identity contract's search table names for the kind (an organization
 * to `/user/organizations` or `/admin/organizations?search=` for an admin,
 * a user to `/admin/users?search=`, an application to `/user/applications`
 * or, for an admin, the config item deep link `/admin/config/clients#<name>`
 * over the client whose id the row's `name` carries, an identity provider
 * to `/user/profile/security` or, for an admin,
 * `/admin/config/providers#<name>`, terms to `/public/policies/<name>` or `/admin/terms`
 * for an admin, a notification to `/notifications`, a session to
 * `/user/profile/sessions` or `/admin/sessions` for an admin, a login to
 * `/admin/logins?username=`, a registration to
 * `/admin/registrations?username=`, a blocked address to
 * `/admin/brute-force`); elsewhere the organization page for an
 * organization, the org console or the admin board for a user, and for
 * everything else the deepest page of the row's collection the row names
 * (provider, an architecture where the collection has no providers,
 * version, else item).
 *
 * @param {Object} row - One search result row
 * @param {{ collections: Array<Object>, role: string, admin: boolean }} app - The app search: the collections the host mounts, the host's role and whether the person is a global admin
 * @returns {string} The path
 */
export const searchRowPath = (row, { collections, role, admin }) => {
  if (role === 'auth-server' && ISSUER_PATHS[row.kind]) {
    return ISSUER_PATHS[row.kind]({ admin, row });
  }
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
  if (row.architecture && collection.hasVersions && !collection.hasProviders) {
    return providerPath(collection, row.org, row.name, row.version, row.architecture);
  }
  if (row.version && collection.hasVersions) {
    return versionPath(collection, row.org, row.name, row.version);
  }
  return itemPath(collection, row.org, row.name);
};
