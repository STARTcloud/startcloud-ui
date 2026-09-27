import { useEffect, useRef, useState } from 'react';

import { useEventStream } from '../../../hooks/useEventStream';
import { log } from '../../../lib/logger';
import { fetchServers } from '../api/agents';
import { isServerRole, selfServer } from '../utils/hosts';

const initialState = status =>
  isServerRole(status)
    ? { servers: [], loaded: false, failed: false }
    : { servers: [selfServer(status)], loaded: true, failed: false };

/**
 * The servers the host lists: on the server role the registry rows of
 * `GET /api/servers`, read once on mount and again when the event stream
 * opens fresh or answers `reset`, the shape of `useSidebarBadges`; on an
 * agent role the one serving agent as `selfServer`, with no request.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @returns {{ servers: Array<Object>, loaded: boolean, failed: boolean }} The servers
 */
export const useServers = status => {
  const [state, setState] = useState(() => initialState(status));
  const server = isServerRole(status);

  const read = () => {
    if (!server) {
      return;
    }
    fetchServers()
      .then(servers => setState({ servers, loaded: true, failed: false }))
      .catch(error => {
        log.api.error('Error fetching servers', { error: error.message });
        setState(current => ({ ...current, loaded: true, failed: true }));
      });
  };

  const readRef = useRef(read);

  useEffect(() => {
    readRef.current = read;
  });

  useEffect(() => {
    readRef.current();
  }, [server]);

  useEventStream('ready', (data, resumed) => {
    if (data && !resumed) {
      readRef.current();
    }
  });

  useEventStream('reset', () => readRef.current());

  return state;
};
