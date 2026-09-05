import { client } from '../../../lib/runtime';

/**
 * The host's own search: `GET /api/search?q=&limit=`, answering
 * `{ query, results, truncated }`.
 *
 * @param {string} query - The text to search for
 * @param {number} limit - How many rows per kind to answer
 * @returns {Promise<Object>} The answer
 */
export const searchServer = (query, limit) =>
  client.get('/api/search', { params: { q: query, limit } });
