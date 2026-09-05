import { useEffect } from 'react';

import { PROFILE_RELOAD_MS } from '../config/constants';
import { subscribeTerminateStream } from '../lib/events';
import { events, session } from '../lib/runtime';

/**
 * What a backend session keeps running while signed in: the profile
 * reload on its interval and the server-sent terminate stream that ends
 * the session when the backend revokes it.
 *
 * @param {Object} options - The session
 * @param {boolean} options.enabled - Whether the session is the app's own backend
 * @param {Object|null} options.user - The session's user
 * @param {() => Promise<Object>} options.reload - The session's profile reload
 */
export const useSessionKeepalive = ({ enabled, user, reload }) => {
  const accessToken = user?.accessToken || '';

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
    if (!enabled || !accessToken) {
      return undefined;
    }
    const url = `${window.location.origin}/api/notifications/events`;
    return subscribeTerminateStream({
      url,
      headers: () => session.headers('GET', url),
      onEnded: () => events.endSession(),
    });
  }, [enabled, accessToken]);
};
