import { useEffect } from 'react';

import { useStatus } from '../contexts/StatusContext';
import {
  connectEventStream,
  disconnectEventStream,
  eventHub,
  events,
  session,
} from '../lib/runtime';
import { streamsEvents } from '../lib/streamTarget';
import { authMethod, hasFeature } from '../utils/capabilities';

const hasSession = ({ method, user, loaded }) => method === 'none' || (loaded && Boolean(user));

const recordOf = value => {
  try {
    return JSON.parse(value || 'null');
  } catch {
    return null;
  }
};

/**
 * Whether a record another tab wrote under the provider's key names a
 * person other than the one this tab holds: both carry an email and the
 * two differ; false while either side names none.
 *
 * @param {Object|null} record - The written record
 * @param {Object|null} user - This tab's session user
 * @returns {boolean} True when the tab must reload into the other person
 */
export const namesAnotherPerson = (record, user) =>
  Boolean(record?.email) && Boolean(user?.email) && record.email !== user.email;

/**
 * Whether the browser still holds an account after a sibling tab removed
 * the cached record: the accounts answer lists at least one entry, signed
 * in or remembered.
 *
 * @param {Object|null} answer - The `GET /api/auth/accounts` answer
 * @returns {boolean} True when a tab must reload instead of signing out
 */
export const othersRemain = answer => (answer?.accounts || []).length > 0;

const switchesAccounts = status =>
  authMethod(status) === 'cookie' && hasFeature(status, 'accounts', 'switch');

/**
 * What a session keeps running: the tab's event stream while
 * `streamsEvents` places one for the host, its own `events` or, on an
 * `idp` host without them, the identity provider's, and the host either
 * needs no session or has a signed-in user
 * confirmed by `load()`, never from the restored cache alone, with the
 * stream's `session-terminated` event ending the session through the
 * provider's own `endSession()`, which clears the cached record and ends
 * it on the bus, and its `profile-updated` and `reset` events reloading
 * the signed-in person's profile at once, so a theme, mode, motion or
 * language changed at the identity provider reaches the open tab through
 * the stream and a tab whose reconnect fell past the ring re-reads the
 * record; beside the stream the platform's own signals: a `storage`
 * event on the provider's own key from another tab of the origin, a
 * removed key signing this tab out through the bus's `logout`, unless
 * the host keeps several accounts on one browser and
 * `GET /api/auth/accounts` still lists one, where the tab reloads the
 * document instead and posts no logout for a person still signed in, a
 * written one naming another person reloading the document into that
 * person and any other written one reloading the profile, and `pageshow`
 * with `persisted`, a
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
  const streaming = streamsEvents(status);
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
    const signedOutElsewhere = () => {
      if (!switchesAccounts(status)) {
        events.emit('logout');
        return;
      }
      session
        .accounts()
        .then(answer => {
          if (othersRemain(answer)) {
            window.location.reload();
            return;
          }
          events.emit('logout');
        })
        .catch(() => events.emit('logout'));
    };
    const onStorage = event => {
      if (!session.storageKey || event.key !== session.storageKey) {
        return;
      }
      if (event.newValue === null) {
        signedOutElsewhere();
        return;
      }
      if (namesAnotherPerson(recordOf(event.newValue), user)) {
        window.location.reload();
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
  }, [reload, status, user]);
};
