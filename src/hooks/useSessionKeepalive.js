import { useEffect } from 'react';

import { PROFILE_RELOAD_MS } from '../config/constants';
import { useStatus } from '../contexts/StatusContext';
import { connectEventStream, disconnectEventStream, eventHub, events } from '../lib/runtime';
import { authMethod, hasFeature } from '../utils/capabilities';

const hasSession = ({ method, user, loaded }) => method === 'none' || (loaded && Boolean(user));

/**
 * What a session keeps running: the profile reload on its interval for a
 * backend session, and the tab's event stream while the host advertises
 * `events` and either needs no session or has a signed-in user confirmed
 * by `load()`, never from the restored cache alone, with the stream's
 * `session-terminated` event ending the session on the bus.
 *
 * @param {Object} options - The session
 * @param {boolean} options.enabled - Whether the session is the app's own backend
 * @param {Object|null} options.user - The session's user
 * @param {boolean} options.loaded - Whether `load()` has confirmed the session
 * @param {() => Promise<Object>} options.reload - The session's profile reload
 */
export const useSessionKeepalive = ({ enabled, user, loaded, reload }) => {
  const status = useStatus();
  const streaming = hasFeature(status, 'events') && Boolean(status.events);
  const connected = streaming && hasSession({ method: authMethod(status), user, loaded });

  useEffect(() => {
    if (!enabled || !user) {
      return undefined;
    }
    const timer = setInterval(reload, PROFILE_RELOAD_MS);
    return () => {
      clearInterval(timer);
    };
  }, [enabled, user, reload]);

  useEffect(() => {
    if (!connected) {
      return undefined;
    }
    connectEventStream(status);
    return disconnectEventStream;
  }, [connected, status, user]);

  useEffect(() => eventHub.subscribe('session-terminated', () => events.endSession()), []);
};
