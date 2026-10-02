import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';

const encoded = value => encodeURIComponent(value);

/**
 * The agent's database statistics, `GET database/stats`: the
 * `databases`, each its files, tables and indexes, and the totals.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @returns {Promise<Object>} The statistics
 */
export const fetchDatabaseStats = (status, id) =>
  client.get(agentPath(status, id, 'database/stats'));

/**
 * The tables of one database, `GET database/{name}/tables`, the
 * `tables` rows.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The database
 * @returns {Promise<Array<Object>>} The rows
 */
export const fetchDatabaseTables = (status, id, name) =>
  client
    .get(agentPath(status, id, `database/${encoded(name)}/tables`))
    .then(data => (Array.isArray(data?.tables) ? data.tables : []));

/**
 * One page of a table's rows, `GET database/{name}/tables/{table}/rows`
 * with the limit, the offset and the order, answered
 * `{ columns, rows, total }`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Object} page - `database`, `table`, `limit`, `offset` and `orderBy`
 * @returns {Promise<Object>} The page
 */
export const fetchDatabaseRows = (status, id, { database, table, limit, offset, orderBy }) =>
  client.get(agentPath(status, id, `database/${encoded(database)}/tables/${encoded(table)}/rows`), {
    params: { limit, offset, ...(orderBy ? { order_by: orderBy } : {}) },
  });

/**
 * Run a maintenance action on the agent's databases,
 * `POST database/{action}`, `vacuum`, `analyze` or `cleanup`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} action - The action
 * @returns {Promise<Object>} The agent's answer
 */
export const runDatabaseMaintenance = (status, id, action) =>
  client.post(agentPath(status, id, `database/${action}`));
