import PropTypes from 'prop-types';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchSnapshots } from '../api/snapshots';
import { MachineSnapshotsContext } from '../hooks/useMachineSnapshots';
import { agentIdOf } from '../utils/hosts';
import { detailKey, taskMachineOf } from '../utils/machines';
import { TERMINAL_TASK_STATUSES } from '../utils/tasks';

const NO_ROWS = [];

const emptyFor = (signedIn, epoch) => ({ epoch, signedIn, machines: {} });

const flightKey = (epoch, key) => `${epoch}|${key}`;

const answered = (epoch, key, entry) => current =>
  current.epoch === epoch
    ? {
        ...current,
        machines: { ...current.machines, [key]: { ...entry, loaded: true, stale: false } },
      }
    : current;

const refused = (epoch, key, message) => current => {
  if (current.epoch !== epoch) {
    return current;
  }
  const snapshots = current.machines[key]?.snapshots || NO_ROWS;
  const entry = { snapshots, failed: true, message, loaded: true, stale: false };
  return { ...current, machines: { ...current.machines, [key]: entry } };
};

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
 * The snapshots of every machine a caller has drawn, behind
 * `useMachineSnapshots`: one request per machine when the first caller
 * asks, a second caller while it is in flight joining it, the rows held
 * for every caller after it and renewed on a caller's `refresh`, the
 * rows held kept on screen while a read fails, the agent's message held
 * beside them; `ask` is the read of a caller that draws, which answers
 * at once while the rows are held fresh, so a caller that mounts as an
 * answer lands asks for nothing twice. The held rows are marked
 * stale and kept on screen, and only the callers that draw a machine's
 * snapshots ask for them again, when the event stream opens fresh or
 * answers `reset` and when the `tasks` topic's `task-updated` event says
 * a task of that machine ended, a snapshot being taken, restored,
 * renamed and deleted by a task; nothing reads on a clock,
 * hyperweaver-ui's thirty-second read of the list not carried over. The
 * rows belong to the session: when `signedIn` changes they are dropped,
 * an answer of the session before it discarded.
 */
const MachineSnapshotsProvider = ({ signedIn, children }) => {
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
      const flight = fetchSnapshots(status, id, name)
        .then(snapshots => {
          copies.current.add(held);
          setState(answered(epoch, key, { snapshots, failed: false, message: '' }));
          return snapshots;
        })
        .catch(error => {
          log.api.error('Error fetching machine snapshots', { id, name, error: error.message });
          copies.current.add(held);
          setState(refused(epoch, key, error.message));
          return NO_ROWS;
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
        ? Promise.resolve(NO_ROWS)
        : read(epoch, id, name),
    [read]
  );

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

  useEventStream('task-updated', data => {
    const machine = taskMachineOf(data);
    if (!TERMINAL_TASK_STATUSES.includes(data?.status) || !machine) {
      return;
    }
    const ended = detailKey(agentIdOf(data), machine);
    forget(copies.current, key => key === ended);
    setState(staledWhere(key => key === ended));
  });

  const value = useMemo(
    () => ({ epoch: state.epoch, machines: state.machines, read, ask }),
    [state.epoch, state.machines, read, ask]
  );

  return (
    <MachineSnapshotsContext.Provider value={value}>{children}</MachineSnapshotsContext.Provider>
  );
};

MachineSnapshotsProvider.propTypes = {
  signedIn: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

export default MachineSnapshotsProvider;
