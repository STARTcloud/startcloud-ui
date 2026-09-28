import PropTypes from 'prop-types';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchMachine } from '../api/machines';
import { MachineDetailContext } from '../hooks/useMachineDetail';
import { agentIdOf } from '../utils/hosts';
import { detailKey } from '../utils/machines';
import { TERMINAL_TASK_STATUSES } from '../utils/tasks';

const emptyFor = (signedIn, epoch) => ({ epoch, signedIn, machines: {} });

const flightKey = (epoch, key) => `${epoch}|${key}`;

const entryOf = (previous, entry) => ({
  ...entry,
  loaded: true,
  stale: false,
  revision: (previous?.revision || 0) + 1,
});

const answered = (epoch, key, entry) => current =>
  current.epoch === epoch
    ? {
        ...current,
        machines: { ...current.machines, [key]: entryOf(current.machines[key], entry) },
      }
    : current;

const staledWhere = matches => current => {
  if (!Object.keys(current.machines).some(matches)) {
    return current;
  }
  return {
    ...current,
    machines: Object.fromEntries(
      Object.entries(current.machines).map(([key, entry]) => [
        key,
        matches(key) ? { ...entry, stale: true } : entry,
      ])
    ),
  };
};

const staled = staledWhere(() => true);

/**
 * The detail of every machine a caller has drawn, behind
 * `useMachineDetail`: one request per machine when the first caller asks,
 * a second caller while it is in flight joining it, the answer held for
 * every caller after it and renewed on a caller's `refresh`. The held
 * answers are marked stale and kept on screen, and only the callers that
 * draw a machine ask for it again, when the event stream opens fresh or
 * answers `reset`, when the `hosts` topic's `stats-updated` event says a
 * machine of that host was made, removed, started or stopped, and when
 * the `tasks` topic's `task-updated` event says a task of that machine
 * ended; nothing reads on a clock. The answers belong to the session:
 * when `signedIn` changes they are dropped, an answer of the session
 * before it discarded.
 */
const MachineDetailProvider = ({ signedIn, children }) => {
  const status = useStatus();
  const [state, setState] = useState(() => emptyFor(signedIn, 0));
  const flights = useRef(null);

  if (state.signedIn !== signedIn) {
    setState(emptyFor(signedIn, state.epoch + 1));
  }

  const read = useCallback(
    (epoch, id, name) => {
      flights.current ||= new Map();
      const key = detailKey(id, name);
      const flying = flights.current.get(flightKey(epoch, key));
      if (flying) {
        return flying;
      }
      const flight = fetchMachine(status, id, name)
        .then(detail => {
          setState(answered(epoch, key, { detail, failed: false }));
          return detail;
        })
        .catch(error => {
          log.api.error('Error fetching machine detail', { id, name, error: error.message });
          setState(answered(epoch, key, { detail: null, failed: true }));
          return null;
        })
        .finally(() => flights.current.delete(flightKey(epoch, key)));
      flights.current.set(flightKey(epoch, key), flight);
      return flight;
    },
    [status]
  );

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      setState(staled);
    }
  });

  useEventStream('reset', () => setState(staled));

  useEventStream('stats-updated', data => {
    const prefix = detailKey(agentIdOf(data), '');
    setState(staledWhere(key => key.startsWith(prefix)));
  });

  useEventStream('task-updated', data => {
    if (!TERMINAL_TASK_STATUSES.includes(data?.status) || !data?.machine_name) {
      return;
    }
    const ended = detailKey(agentIdOf(data), data.machine_name);
    setState(staledWhere(key => key === ended));
  });

  const value = useMemo(
    () => ({ epoch: state.epoch, machines: state.machines, read }),
    [state.epoch, state.machines, read]
  );

  return <MachineDetailContext.Provider value={value}>{children}</MachineDetailContext.Provider>;
};

MachineDetailProvider.propTypes = {
  signedIn: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

export default MachineDetailProvider;
