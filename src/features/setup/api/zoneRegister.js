import { client } from '../../../lib/runtime';

const PUBLIC = { auth: false };

/**
 * Register a zoneweaver-agent's front end and back end, hyperweaver-ui's
 * `ZoneRegister` form, `POST /api/setup` with the two hosts, ports,
 * protocols and security codes.
 *
 * @param {Object} body - The form
 * @returns {Promise<Object>} The answer
 */
export const registerZone = body => client.post('/api/setup', body, PUBLIC);
