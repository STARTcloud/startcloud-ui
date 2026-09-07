import { encodePath } from '../../../lib/apiClient';
import { client } from '../../../lib/runtime';

const queryOf = params => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const logins = params => client.get('/api/admin/logins', { params });

export const registrations = params => client.get('/api/admin/registrations', { params });

export const sessions = params => client.get('/api/admin/sessions', { params });

export const revokeSession = sessionId =>
  client.delete(encodePath('api', 'admin', 'sessions', sessionId));

/**
 * The URL of one JSON export attachment, `/api/admin/export/<name>` with
 * the page's filters as its query, followed as a top-level navigation.
 *
 * @param {string} name - `logins`, `registrations` or `users`
 * @param {Object} params - The filters, empty values dropped
 * @returns {string} The URL
 */
export const exportUrl = (name, params) =>
  `${encodePath('api', 'admin', 'export', name)}${queryOf(params)}`;
