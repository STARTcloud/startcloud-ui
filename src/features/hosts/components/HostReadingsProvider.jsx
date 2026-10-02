import PropTypes from 'prop-types';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchReading } from '../api/monitoring';
import { HostReadingsContext } from '../hooks/useHostReadings';
import { agentIdOf } from '../utils/hosts';
import { NETWORKING_READS } from '../utils/monitoring';
import { TERMINAL_TASK_STATUSES } from '../utils/tasks';

const TASK_STATS = 'task-stats';

const emptyFor = (signedIn, epoch) => ({ epoch, signedIn, hosts: {} });

const flightKey = (epoch, id, key) => `${epoch}|${id}|${key}`;

const withEntry = ({ current, id, key, entry }) => ({
  ...current,
  hosts: { ...current.hosts, [id]: { ...current.hosts[id], [key]: entry } },
});

const answered =
  ({ epoch, id, key, entry }) =>
  current =>
    current.epoch === epoch
      ? withEntry({ current, id, key, entry: { ...entry, loaded: true, stale: false } })
      : current;

const staleEntries = entries =>
  Object.fromEntries(
    Object.entries(entries).map(([key, entry]) => [key, { ...entry, stale: true }])
  );

const staled = current => ({
  ...current,
  hosts: Object.fromEntries(
    Object.entries(current.hosts).map(([id, entries]) => [id, staleEntries(entries)])
  ),
});

const staledOne = (id, key) => current => {
  const entry = current.hosts[id]?.[key];
  return entry ? withEntry({ current, id, key, entry: { ...entry, stale: true } }) : current;
};

const staledMany = (id, keys) => current =>
  keys.reduce((next, key) => staledOne(id, key)(next), current);

/**
 * The answers the Overview's panels draw of every host a caller has
 * drawn, behind `useHostReading`: one request per host and read when the
 * first caller asks, a second caller while it is in flight joining it,
 * the answer held for every caller after it. When the event stream opens
 * fresh or answers `reset` the held answers are marked stale and kept on
 * screen, and only the callers that draw one ask for it again. The task
 * queue's counts follow the `tasks` topic: a `task-updated` event that
 * carries a status the task was not seen in marks that host's counts
 * stale, so they are read again once a status moved and never on a
 * clock. The answers belong to the session: when `signedIn` changes they
 * are dropped, an answer of the session before it discarded.
 */
const HostReadingsProvider = ({ signedIn, children }) => {
  const status = useStatus();
  const [state, setState] = useState(() => emptyFor(signedIn, 0));
  const flights = useRef(null);
  const seen = useRef(null);

  if (state.signedIn !== signedIn) {
    setState(emptyFor(signedIn, state.epoch + 1));
  }

  const read = useCallback(
    (epoch, id, key) => {
      flights.current ||= new Map();
      const flying = flights.current.get(flightKey(epoch, id, key));
      if (flying) {
        return flying;
      }
      const flight = fetchReading(status, id, key)
        .then(data => {
          setState(answered({ epoch, id, key, entry: { data, failed: false } }));
          return data;
        })
        .catch(error => {
          log.api.error('Error fetching host reading', { id, key, error: error.message });
          setState(answered({ epoch, id, key, entry: { data: null, failed: true } }));
          return null;
        })
        .finally(() => flights.current.delete(flightKey(epoch, id, key)));
      flights.current.set(flightKey(epoch, id, key), flight);
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

  useEventStream('task-updated', data => {
    const id = agentIdOf(data);
    const task = `${id}|${data?.id}`;
    seen.current ||= new Map();
    if (seen.current.get(task) === data?.status) {
      return;
    }
    if (TERMINAL_TASK_STATUSES.includes(data?.status)) {
      seen.current.delete(task);
      setState(staledMany(id, [TASK_STATS, ...NETWORKING_READS]));
      return;
    }
    seen.current.set(task, data?.status);
    setState(staledOne(id, TASK_STATS));
  });

  const value = useMemo(
    () => ({ epoch: state.epoch, hosts: state.hosts, read }),
    [state.epoch, state.hosts, read]
  );

  return <HostReadingsContext.Provider value={value}>{children}</HostReadingsContext.Provider>;
};

HostReadingsProvider.propTypes = {
  signedIn: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

export default HostReadingsProvider;
