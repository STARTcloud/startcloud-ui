import { useEffect } from 'react';

import { useStatus } from '../contexts/StatusContext';
import {
  connectEventStream,
  disconnectEventStream,
  eventHub,
  events,
  session,
} from '../lib/runtime';
import { authMethod, hasFeature } from '../utils/capabilities';

const hasSession = ({ method, user, loaded }) => method === 'none' || (loaded && Boolean(user));

/**
 * What a session keeps running: the tab's event stream while the host
 * advertises `events` and either needs no session or has a signed-in user
 * confirmed by `load()`, never from the restored cache alone, with the
 * stream's `session-terminated` event ending the session through the
 * provider's own `endSession()`, which clears the cached record and ends
 * it on the bus, and its `profile-updated` and `reset` events reloading
 * the signed-in person's profile at once, so a look, theme, motion or
 * language changed at the identity provider reaches the open tab through
 * the stream and a tab whose reconnect fell past the ring re-reads the
 * record; beside the stream the platform's own signals: a `storage`
 * event on the provider's own key from another tab of the origin, a
 * removed key signing this tab out through the bus's `logout` and a
 * written one reloading the profile, and `pageshow` with `persisted`, a
 * document back from the back/forward cache with its old heap, reloading
 * the profile. No timer polls anything; the stream, the storage event and
 * the page's own lifecycle are the only things that say the record
 * changed.
 *
 * @param {Object} options - The session
 * @param {Object|null} options.user - The session's user
 * @param {boolean} options.loaded - Whether `load()` has confirmed the session
 * @param {() => Promise<Object>} options.reload - The session's profile reload
 */
export const useSessionKeepalive = ({ user, loaded, reload }) => {
  const status = useStatus();
  const streaming = hasFeature(status, 'events') && Boolean(status.events);
  const connected = streaming && hasSession({ method: authMethod(status), user, loaded });

  useEffect(() => {
    if (!connected) {
      return undefined;
    }
    connectEventStream(status);
    return disconnectEventStream;
  }, [connected, status]);

  useEffect(() => eventHub.subscribe('session-terminated', () => session.endSession()), []);

  useEffect(() => {
    if (!user) {
      return undefined;
    }
    const offUpdated = eventHub.subscribe('profile-updated', () => reload());
    const offReset = eventHub.subscribe('reset', () => reload());
    return () => {
      offUpdated();
      offReset();
    };
  }, [user, reload]);

  useEffect(() => {
    const onStorage = event => {
      if (!session.storageKey || event.key !== session.storageKey) {
        return;
      }
      if (event.newValue === null) {
        events.emit('logout');
        return;
      }
      reload();
    };
    const onPageShow = event => {
      if (event.persisted) {
        reload();
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [reload]);
};
