import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';

import { detailKey } from '../utils/machines';
import { machineSeriesOf } from '../utils/machineSeries';
import { windowMinutes } from '../utils/monitoring';
import { collectionOf } from '../utils/resources';
import { drawnRows } from '../utils/series';

import { useHostReading } from './useHostReadings';
import { useHostSeriesQuery } from './useHostSeries';

export const MachineSeriesContext = createContext(null);

const NO_ROWS = [];

const EMPTY = {
  rows: NO_ROWS,
  strategy: '',
  loaded: false,
  failed: false,
  message: '',
  stale: false,
  window: '',
};

const NO_PROVIDER = {
  epoch: 0,
  machines: {},
  read: () => Promise.resolve(null),
  ask: () => Promise.resolve(null),
  refreshMachine: () => undefined,
};

/**
 * One series of one machine, `metric` naming it in `MACHINE_SERIES` or a
 * link as `link:` and its name, from the hosts feature's context, so a
 * chart, its expanded dialog and its badges share one copy: the series
 * opens from the browser's ring and is read over the host's window
 * while `wanted` by the first caller that draws it, again by the callers
 * that draw it after the event stream opened fresh or answered `reset`,
 * after the host's window changed, and on `refresh`, the read a person
 * asks for; the series of a link grows between reads by the samples the
 * `monitoring` topic pushes of that link, and nothing reads on a clock.
 * `rows` are the samples inside the host's window before the newest
 * held, the 180 newest of each entity. The caller decides `wanted` by
 * the host's own row, `machineChartGates`, each route existing on one
 * agent alone. `strategy` is the agent's own word for how it answered,
 * `realtime` of an agent that answers the one sample it takes at the
 * read, and `message` its own word for a read that failed.
 *
 * @param {Object} options - The machine, the series and whether to read it
 * @param {string} options.id - The registry id, or `self` on an agent role
 * @param {string} options.name - The machine name
 * @param {string} options.metric - The series' key, e.g. `zone-usage` or `link:vnic0`
 * @param {boolean} options.wanted - Whether the caller needs the series read
 * @returns {{ rows: Array<Object>, strategy: string, loaded: boolean, failed: boolean, message: string, refresh: Function }} The series, oldest first
 */
export const useMachineSeries = ({ id, name, metric, wanted }) => {
  const { epoch, machines, read, ask } = useContext(MachineSeriesContext) || NO_PROVIDER;
  const { query } = useHostSeriesQuery(id);
  const status = useHostReading(id, 'monitoring-status');
  const { interval } = collectionOf(status.data);
  const { window } = query;
  const held = machines[detailKey(id, name)]?.[metric] || EMPTY;
  const { loaded, stale } = held;
  const changed = held.window !== window;
  const { entity } = machineSeriesOf(metric);
  const minutes = windowMinutes(window);

  useEffect(() => {
    if (wanted && (!loaded || stale || changed)) {
      ask({ epoch, id, name, metric, window, interval });
    }
  }, [wanted, loaded, stale, changed, epoch, id, name, metric, window, interval, ask]);

  const refresh = useCallback(() => {
    if (wanted) {
      read({ epoch, id, name, metric, window, interval });
    }
  }, [wanted, read, epoch, id, name, metric, window, interval]);

  const rows = useMemo(
    () => (wanted ? drawnRows(held.rows, { entity, minutes }) : NO_ROWS),
    [wanted, held.rows, entity, minutes]
  );

  return {
    rows,
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
  const { refreshMachine } = useContext(MachineSeriesContext) || NO_PROVIDER;
  return refreshMachine;
};
