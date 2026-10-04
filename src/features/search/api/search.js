import { client } from '../../../lib/runtime';

/**
 * One search request, `GET {path}?q=&kinds=&scope=&limit=&after=`.
 *
 * @param {string} path - The search path
 * @param {Object} params - `{ q, kinds, scope, limit, after }`
 * @param {AbortSignal} signal - Aborts the request
 * @returns {Promise<Object>} The answer
 */
export const searchAt = (path, params, signal) => client.get(path, { params, signal });
