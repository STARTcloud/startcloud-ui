import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';
import { READS, SERIES } from '../utils/monitoring';

/**
 * One of the Overview's reads of one agent, the path `READS` names for
 * `key` at the path the role fixes; the caller checks the host's tokens
 * first, an agent without the surface answering 404.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} key - The read's key in `READS`, e.g. `swap`
 * @returns {Promise<Object>} The agent's answer
 */
export const fetchReading = (status, id, key) =>
  client.get(agentPath(status, id, READS[key].path), { params: READS[key].params || {} });

/**
 * The history of one series of one agent, the path `SERIES` names for
 * `metric`, with `since`, the newest sample the browser holds or the
 * instant the window reaches back to, `until`, the present, and, while
 * the agent's collection interval is known, `limit`, the samples the
 * window holds at it, beside the series' own parameters; an agent that
 * keeps no history answers the one sample it took, its
 * `sampling.strategy` reading `realtime`.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} metric - The series' key in `SERIES`, e.g. `cpu`
 * @param {{ since: string, until: string, limit?: number }} params - The parameters of `historyParams`
 * @returns {Promise<Object>} The agent's answer, its rows under the series' member
 */
export const fetchSeries = (status, id, metric, params) =>
  client.get(agentPath(status, id, SERIES[metric].path), {
    params: { ...params, ...SERIES[metric].params },
  });
