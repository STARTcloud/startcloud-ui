import { client } from '../../../lib/runtime';

/**
 * The person's preferences, `GET /api/user/preferences`, `default_domain`
 * among them on the hyperweaver-server role, the `user` row of the create
 * wizard's domain chain.
 *
 * @returns {Promise<Object>} The preferences
 */
export const fetchPreferences = () => client.get('/api/user/preferences');
