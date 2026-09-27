import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useStatus } from '../../../contexts/StatusContext';
import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchStats } from '../api/agents';
import { HostStatsContext } from '../hooks/useHostStats';
import { agentIdOf, withoutAgentId } from '../utils/hosts';

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

/**
 * The stats of every host a caller has drawn, behind `useHostStats`,
 * `useHostStatsLoad` and `useHostStatsRevision`: one request per host
 * when the first caller asks, a second caller while it is in flight
 * joining it, the copy held for every caller after it, so a read after
 * an action or a person's Refresh renews what the page, the Controls
 * menu and the tree draw; every answer raises the host's `revision` by
 * one, the word the tree hands the sidebar so its machines are asked for
 * again from the copy. Between reads the `hosts` topic's
 * `stats-updated` event is the copy: the stats it carries replace the
 * host's held ones, so a machine that started or stopped reaches every
 * caller by push. When the event stream opens fresh or answers
 * `reset` the held copies are marked stale and kept on screen, and only
 * the callers that draw a host ask for it again. The copies belong to
 * the session: when `signedIn` changes they are dropped, an answer of
 * the session before it discarded.
 */
const HostStatsProvider = ({ signedIn, children }) => {
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
      const flight = fetchStats(status, id)
        .then(stats => {
          copies.current.set(key, stats);
          setState(answered(epoch, id, { stats, failed: false }));
          return stats;
        })
        .catch(error => {
          log.api.error('Error fetching host stats', { id, error: error.message });
          copies.current.set(key, null);
          setState(answered(epoch, id, { stats: null, failed: true }));
          return null;
        })
        .finally(() => flights.current.delete(key));
      flights.current.set(key, flight);
      return flight;
    },
    [status]
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
    const stats = withoutAgentId(data);
    copies.current ||= new Map();
    copies.current.set(keyOf(epochRef.current, id), stats);
    setState(current => answered(current.epoch, id, { stats, failed: false })(current));
  });

  const value = useMemo(
    () => ({ epoch: state.epoch, hosts: state.hosts, read, load }),
    [state, read, load]
  );

  return <HostStatsContext.Provider value={value}>{children}</HostStatsContext.Provider>;
};

HostStatsProvider.propTypes = {
  signedIn: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};

export default HostStatsProvider;
