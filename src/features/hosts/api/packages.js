import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const listOf = (data, member) => (Array.isArray(data?.[member]) ? data[member] : []);

/**
 * The packages of a host, `GET system/packages`, hyperweaver-ui's read:
 * the name pattern as `filter` and `all` while every package is wanted,
 * each only where given, answered as the `packages` rows.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} [options] - `filter` and `all`
 * @returns {Promise<Array<Object>>} The rows
 */
export const fetchPackages = (status, id, { filter = '', all = false } = {}) =>
  client
    .get(agentPath(status, id, 'system/packages'), {
      params: { ...(filter ? { filter } : {}), ...(all ? { all: true } : {}) },
    })
    .then(data => listOf(data, 'packages'));

/**
 * The packages a repository search answers, `GET system/packages/search`
 * with the query, remote and not local, hyperweaver-ui's read, answered
 * as the `results` rows.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} query - The search
 * @returns {Promise<Array<Object>>} The hits
 */
export const searchPackages = (status, id, query) =>
  client
    .get(agentPath(status, id, 'system/packages/search'), {
      params: { query, local: false, remote: true },
    })
    .then(data => listOf(data, 'results'));

/**
 * One package's detail, `GET system/packages/info` with the package and
 * `remote` while it is not installed.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The package
 * @param {boolean} remote - Whether to ask the repository
 * @returns {Promise<Object|string>} The detail
 */
export const fetchPackageInfo = (status, id, name, remote) =>
  client.get(agentPath(status, id, 'system/packages/info'), {
    params: { package: name, remote },
  });

/**
 * Install packages, `POST system/packages/install` with the body of
 * `packageActionBody`, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body
 * @returns {Promise<Object>} The agent's answer
 */
export const installPackages = (status, id, body) =>
  client.post(agentPath(status, id, 'system/packages/install'), body);

/**
 * Uninstall packages, `POST system/packages/uninstall` with the body of
 * `packageActionBody`, a queued task.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body
 * @returns {Promise<Object>} The agent's answer
 */
export const uninstallPackages = (status, id, body) =>
  client.post(agentPath(status, id, 'system/packages/uninstall'), body);
