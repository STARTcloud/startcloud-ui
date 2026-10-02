import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

/**
 * Make a local template of one machine, `POST templates/export`, a
 * queued task, asked for only of a host that lists `templates`: the body
 * names the machine, `machine_name`, and carries the `filename` and the
 * `snapshot_name` the template is made from where given.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body of `exportBody`
 * @returns {Promise<Object>} The queued task
 */
export const exportTemplate = (status, id, body) =>
  client.post(agentPath(status, id, 'templates/export'), body);

/**
 * Make a template of one machine and send it to a registry,
 * `POST templates/publish`, a queued task, asked for only of a host that
 * lists `templates`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} body - The body of `publishBody`
 * @returns {Promise<Object>} The queued task
 */
export const publishTemplate = (status, id, body) =>
  client.post(agentPath(status, id, 'templates/publish'), body);

/**
 * The registries a host may send a template to, `GET templates/sources`,
 * asked for only of a host that lists `templates`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Array<Object>>} The sources, `[{ name, url, enabled, default }]`
 */
export const fetchTemplateSources = (status, id) =>
  client
    .get(agentPath(status, id, 'templates/sources'))
    .then(data => (Array.isArray(data?.sources) ? data.sources : []));
