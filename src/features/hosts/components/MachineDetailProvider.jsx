import PropTypes from 'prop-types';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchMachine } from '../api/machines';
import { MachineDetailContext } from '../hooks/useMachineDetail';
import { agentIdOf } from '../utils/hosts';
import { detailKey, taskMachineOf } from '../utils/machines';
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

const heldKey = flight => flight.slice(flight.indexOf('|') + 1);

const forget = (copies, matches) =>
  [...(copies || [])]
    .filter(flight => matches(heldKey(flight)))
    .forEach(flight => copies.delete(flight));

/**
 * The detail of every machine a caller has drawn, behind
 * `useMachineDetail`: one request per machine when the first caller asks,
 * a second caller while it is in flight joining it, the answer held for
 * every caller after it and renewed on a caller's `refresh`; `ask` is
 * the read of a caller that draws, which answers at once while the
 * answer is held fresh, so a caller that mounts as an answer lands asks
 * for nothing twice. The held
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
  const copies = useRef(null);

  if (state.signedIn !== signedIn) {
    setState(emptyFor(signedIn, state.epoch + 1));
  }

  const read = useCallback(
    (epoch, id, name) => {
      flights.current ||= new Map();
      copies.current ||= new Set();
      const key = detailKey(id, name);
      const held = flightKey(epoch, key);
      const flying = flights.current.get(held);
      if (flying) {
        return flying;
      }
      copies.current.delete(held);
      const flight = fetchMachine(status, id, name)
        .then(detail => {
          copies.current.add(held);
          setState(answered(epoch, key, { detail, failed: false }));
          return detail;
        })
        .catch(error => {
          log.api.error('Error fetching machine detail', { id, name, error: error.message });
          copies.current.add(held);
          setState(answered(epoch, key, { detail: null, failed: true }));
          return null;
        })
        .finally(() => flights.current.delete(held));
      flights.current.set(held, flight);
      return flight;
    },
    [status]
  );

  const ask = useCallback(
    (epoch, id, name) =>
      copies.current?.has(flightKey(epoch, detailKey(id, name)))
        ? Promise.resolve(null)
        : read(epoch, id, name),
    [read]
  );

  const stale = matches => {
    forget(copies.current, matches);
    setState(staledWhere(matches));
  };

  const staleAll = () => {
    copies.current?.clear();
    setState(staled);
  };

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      staleAll();
    }
  });

  useEventStream('reset', staleAll);

  useEventStream('stats-updated', data => {
    const prefix = detailKey(agentIdOf(data), '');
    stale(key => key.startsWith(prefix));
  });

  useEventStream('task-updated', data => {
    const machine = taskMachineOf(data);
    if (!TERMINAL_TASK_STATUSES.includes(data?.status) || !machine) {
      return;
    }
    const ended = detailKey(agentIdOf(data), machine);
    stale(key => key === ended);
  });

  const value = useMemo(
    () => ({ epoch: state.epoch, machines: state.machines, read, ask }),
    [state.epoch, state.machines, read, ask]
  );

  return <MachineDetailContext.Provider value={value}>{children}</MachineDetailContext.Provider>;
};

MachineDetailProvider.propTypes = {
  signedIn: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

export default MachineDetailProvider;
