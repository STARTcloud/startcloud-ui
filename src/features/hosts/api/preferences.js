import { client } from '../../../lib/runtime';

/**
 * The person's preferences, `GET /api/user/preferences`, `default_domain`
 * among them on the hyperweaver-server role, the `user` row of the create
 * wizard's domain chain.
 *
 * @returns {Promise<Object>} The preferences
 */
export const fetchPreferences = () => client.get('/api/user/preferences');

/**
 * The person's deploy target on the hyperweaver-server role,
 * `GET /api/user/deploy`, `{ deploy_target }` of `local` or this server's
 * own origin, `local` while unset; a `404` is an answer and not logged.
 *
 * @returns {Promise<{ deploy_target: string }>} The deploy row
 */
export const fetchDeployTarget = () => client.get('/api/user/deploy', { expected: [404] });

/**
 * The deploy target written, `PATCH /api/user/deploy` under the `deploy`
 * form of the host's rules, refused `422` at `/deploy_target` for a value
 * that is neither `local` nor this server's origin.
 *
 * @param {{ deploy_target: string }} body - The target
 * @returns {Promise<Object>} The answer
 */
export const saveDeployTarget = body => client.patch('/api/user/deploy', body);
