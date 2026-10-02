import { createContext, useCallback, useContext, useEffect } from 'react';

import { detailKey } from '../utils/machines';

export const MachineSeriesContext = createContext(null);

const NO_ROWS = [];

const NO_METRICS = {};

const EMPTY = {
  rows: NO_ROWS,
  strategy: '',
  loaded: false,
  failed: false,
  message: '',
  stale: false,
};

const NO_PROVIDER = {
  epoch: 0,
  machines: {},
  read: () => Promise.resolve(null),
};

/**
 * One series of one machine, `metric` naming it in `MACHINE_SERIES` or a
 * link as `link:` and its name, from the hosts feature's context, so a
 * chart, its expanded dialog and its badges share one copy: read once
 * while `wanted` by the first caller that draws the series, again by
 * the callers that draw it after the event stream opened fresh or
 * answered `reset`, and on `refresh`, the read a person asks for; the
 * series of a link grows between reads by the samples the `monitoring`
 * topic pushes of that link, and nothing reads on a clock. The caller
 * decides `wanted` by the host's own row, `machineChartGates`, each
 * route existing on one agent alone. `strategy` is the agent's own word
 * for how it answered, `realtime` of an agent that answers the one
 * sample it takes at the read, and `message` its own word for a read
 * that failed.
 *
 * @param {Object} options - The machine, the series and whether to read it
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {string} options.name - The machine name
 * @param {string} options.metric - The series' key, e.g. `zone-usage` or `link:vnic0`
 * @param {boolean} options.wanted - Whether the caller needs the series read
 * @returns {{ rows: Array<Object>, strategy: string, loaded: boolean, failed: boolean, message: string, refresh: Function }} The series, oldest first
 */
export const useMachineSeries = ({ id, name, metric, wanted }) => {
  const { epoch, machines, read } = useContext(MachineSeriesContext) || NO_PROVIDER;
  const held = machines[detailKey(id, name)]?.[metric] || EMPTY;
  const { loaded, stale } = held;

  useEffect(() => {
    if (wanted && (!loaded || stale)) {
      read({ epoch, id, name, metric });
    }
  }, [wanted, loaded, stale, epoch, id, name, metric, read]);

  const refresh = useCallback(() => {
    if (wanted) {
      read({ epoch, id, name, metric });
    }
  }, [wanted, read, epoch, id, name, metric]);

  return {
    rows: wanted ? held.rows : NO_ROWS,
    strategy: held.strategy,
    loaded: wanted && loaded,
    failed: wanted && held.failed,
    message: wanted && held.failed ? held.message : '',
    refresh,
  };
};

/**
 * The read of every series held of one machine, for the page's Refresh:
 * `refresh(id, name)` reads again every series a caller drew of that
 * machine and none that nobody drew.
 *
 * @returns {Function} `refresh(id, name)`
 */
export const useMachineSeriesRefresh = () => {
  const { epoch, machines, read } = useContext(MachineSeriesContext) || NO_PROVIDER;
  return useCallback(
    (id, name) => {
      Object.keys(machines[detailKey(id, name)] || NO_METRICS).forEach(metric =>
        read({ epoch, id, name, metric })
      );
    },
    [epoch, machines, read]
  );
};
