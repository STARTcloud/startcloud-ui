import PropTypes from 'prop-types';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchApplications } from '../api/machines';
import { HostApplicationsContext } from '../hooks/useHostApplications';

const emptyFor = (signedIn, epoch) => ({ epoch, signedIn, hosts: {} });

const flightKey = (epoch, id) => `${epoch}|${id}`;

const answered = (epoch, id, entry) => current =>
  current.epoch === epoch
    ? {
        ...current,
        hosts: { ...current.hosts, [id]: { ...entry, loaded: true, stale: false } },
      }
    : current;

const staled = current => ({
  ...current,
  hosts: Object.fromEntries(
    Object.entries(current.hosts).map(([id, entry]) => [id, { ...entry, stale: true }])
  ),
});

/**
 * The applications of every host a caller has wanted, behind
 * `useHostApplications`: one request per host when the first caller
 * asks, a second caller while it is in flight joining it, and the answer
 * held for every caller after it, an answer landing after its caller
 * stopped wanting it kept all the same. The held answers are marked stale
 * and kept when the event stream opens fresh or answers `reset`, and
 * asked for again only by a caller that wants them; nothing reads on a
 * clock. The answers belong to the session: when `signedIn` changes they
 * are dropped, an answer of the session before it discarded.
 */
const HostApplicationsProvider = ({ signedIn, children }) => {
  const status = useStatus();
  const [state, setState] = useState(() => emptyFor(signedIn, 0));
  const flights = useRef(null);
  const copies = useRef(null);

  if (state.signedIn !== signedIn) {
    setState(emptyFor(signedIn, state.epoch + 1));
  }

  const read = useCallback(
    (epoch, id) => {
      flights.current ||= new Map();
      copies.current ||= new Set();
      const held = flightKey(epoch, id);
      const flying = flights.current.get(held);
      if (flying) {
        return flying;
      }
      copies.current.delete(held);
      const flight = fetchApplications(status, id)
        .then(applications => {
          copies.current.add(held);
          setState(answered(epoch, id, { applications, failed: false }));
          return applications;
        })
        .catch(error => {
          log.api.error('Error fetching applications', { id, error: error.message });
          copies.current.add(held);
          setState(answered(epoch, id, { applications: [], failed: true }));
          return null;
        })
        .finally(() => flights.current.delete(held));
      flights.current.set(held, flight);
      return flight;
    },
    [status]
  );

  const ask = useCallback(
    (epoch, id) =>
      copies.current?.has(flightKey(epoch, id)) ? Promise.resolve(null) : read(epoch, id),
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

  const value = useMemo(
    () => ({ epoch: state.epoch, hosts: state.hosts, ask }),
    [state.epoch, state.hosts, ask]
  );

  return (
    <HostApplicationsContext.Provider value={value}>{children}</HostApplicationsContext.Provider>
  );
};

HostApplicationsProvider.propTypes = {
  signedIn: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

export default HostApplicationsProvider;
