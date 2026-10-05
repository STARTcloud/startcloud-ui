import { client } from '../../../lib/runtime';
import { agentPath } from '../utils/hosts';
import { machineSeriesOf, machineSeriesParams } from '../utils/machineSeries';

/**
 * One series of one machine, the path `MACHINE_SERIES` names for
 * `metric`, with the parameters `machineSeriesParams` makes of the
 * machine, the host's window, the agent's collection interval, the
 * newest sample the browser holds and the present: the usage and the
 * per-volume disk I/O of a zone and the usage of one of its links since
 * the newest held sample or the window's start, and the usage of a
 * VirtualBox machine, which the agent answers as the one sample it takes
 * at the read, its `sampling.strategy` reading `realtime`. The caller
 * checks the host's tokens and hypervisors first, each route existing on
 * one agent alone.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {string} name - The machine name
 * @param {string} metric - The series' key, e.g. `zone-usage` or `link:vnic0`
 * @param {{ window: string, interval: number, newest: number }} query - The window's key, the interval in seconds and the newest held instant in milliseconds
 * @returns {Promise<Object>} The agent's answer, its rows under the series' member
 */
export const fetchMachineSeries = (status, id, name, metric, { window, interval, newest }) =>
  client.get(agentPath(status, id, machineSeriesOf(metric).path), {
    params: machineSeriesParams({ metric, name, window, interval, newest, now: Date.now() }),
  });
