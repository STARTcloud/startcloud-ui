import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchMachines } from '../api/agents';
import { HostMachinesContext } from '../hooks/useHostMachines';
import { agentIdOf } from '../utils/hosts';

const emptyFor = (signedIn, epoch) => ({ epoch, signedIn, hosts: {} });

const keyOf = (epoch, id) => `${epoch}|${id}`;

const entryOf = (previous, entry) => ({
  ...entry,
  loaded: true,
  stale: false,
  revision: (previous?.revision || 0) + 1,
});

const answered = (epoch, id, entry) => current =>
  current.epoch === epoch
    ? { ...current, hosts: { ...current.hosts, [id]: entryOf(current.hosts[id], entry) } }
    : current;

const staled = current => ({
  ...current,
  hosts: Object.fromEntries(
    Object.entries(current.hosts).map(([id, entry]) => [id, { ...entry, stale: true }])
  ),
});

const staledOne = id => current =>
  current.hosts[id]
    ? { ...current, hosts: { ...current.hosts, [id]: { ...current.hosts[id], stale: true } } }
    : current;

/**
 * The machine rows of every host a caller has drawn, behind
 * `useHostMachines` and `useMachineRow`: one request per host when the
 * first caller asks, a second caller while it is in flight joining it,
 * the rows held for every caller after it, renewed on a caller's
 * `refresh`; every answer raises the host's `revision` by one, and
 * `load` answers a caller that is no component the rows held while they
 * are fresh and the one request otherwise, and `ask` a caller that
 * draws the same way, so a caller that mounts as an answer lands asks
 * for nothing twice. When the event stream opens
 * fresh or answers `reset` the held rows are marked stale and kept on
 * screen, and only the callers that draw a host ask for it again; the
 * `hosts` topic's `stats-updated` event, sent when a machine of a host
 * is made or removed and when one starts or stops, marks that host's
 * rows stale the same way, so a machine's state follows the stream and
 * nothing reads on a clock. The rows belong to the session: when
 * `signedIn` changes they are dropped, an answer of the session before
 * it discarded. `organization` is the
 * uuid of the organization a person operates under, empty for All, the
 * choice the hooks narrow the rows and the names of a host's stats by;
 * the provider holds every row the agent answered and asks for none
 * because of the choice.
 */
const HostMachinesProvider = ({ signedIn, organization, children }) => {
  const status = useStatus();
  const [state, setState] = useState(() => emptyFor(signedIn, 0));
  const flights = useRef(null);
  const copies = useRef(null);
  const epochRef = useRef(state.epoch);

  if (state.signedIn !== signedIn) {
    setState(emptyFor(signedIn, state.epoch + 1));
  }

  useEffect(() => {
    epochRef.current = state.epoch;
  });

  const read = useCallback(
    (epoch, id) => {
      flights.current ||= new Map();
      copies.current ||= new Map();
      const key = keyOf(epoch, id);
      const flying = flights.current.get(key);
      if (flying) {
        return flying;
      }
      copies.current.delete(key);
      const flight = fetchMachines(status, id)
        .then(machines => {
          copies.current.set(key, machines);
          setState(answered(epoch, id, { machines, failed: false, message: '' }));
          return machines;
        })
        .catch(error => {
          log.api.error('Error fetching host machines', { id, error: error.message });
          copies.current.set(key, []);
          setState(answered(epoch, id, { machines: [], failed: true, message: error.message }));
          return [];
        })
        .finally(() => flights.current.delete(key));
      flights.current.set(key, flight);
      return flight;
    },
    [status]
  );

  const ask = useCallback(
    (epoch, id) =>
      copies.current?.has(keyOf(epoch, id))
        ? Promise.resolve(copies.current.get(keyOf(epoch, id)))
        : read(epoch, id),
    [read]
  );

  const load = useCallback(
    id => {
      const key = keyOf(epochRef.current, id);
      return copies.current?.has(key)
        ? Promise.resolve(copies.current.get(key))
        : read(epochRef.current, id);
    },
    [read]
  );

  const stale = () => {
    copies.current?.clear();
    setState(staled);
  };

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      stale();
    }
  });

  useEventStream('reset', stale);

  useEventStream('stats-updated', data => {
    const id = agentIdOf(data);
    copies.current?.delete(keyOf(epochRef.current, id));
    setState(staledOne(id));
  });

  const value = useMemo(
    () => ({ epoch: state.epoch, hosts: state.hosts, read, ask, load, organization }),
    [state.epoch, state.hosts, read, ask, load, organization]
  );

  return <HostMachinesContext.Provider value={value}>{children}</HostMachinesContext.Provider>;
};

HostMachinesProvider.propTypes = {
  signedIn: PropTypes.bool.isRequired,
  organization: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default HostMachinesProvider;
