import PropTypes from 'prop-types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { organizationShape } from '../components/layout/OrgSwitcherModal';
import { useNotify } from '../contexts/NoticeContext';
import { currentPath } from '../lib/returnTo';

const EMPTY = { user: null, organizations: [], oidc: false, issuerUrl: '' };

const resolveActiveOrg = (organizations, stored) => {
  if (stored && organizations.some(org => org.uuid === stored)) {
    return stored;
  }
  return (organizations.find(org => org.primary) || organizations[0])?.uuid || '';
};

export const sessionStateShape = PropTypes.shape({
  user: PropTypes.object,
  claims: PropTypes.object,
  favorites: PropTypes.array.isRequired,
  organizations: PropTypes.arrayOf(organizationShape).isRequired,
  oidc: PropTypes.bool.isRequired,
  issuerUrl: PropTypes.string.isRequired,
  activeOrgUuid: PropTypes.string.isRequired,
  loaded: PropTypes.bool.isRequired,
  pickOrg: PropTypes.func.isRequired,
  sessionEnded: PropTypes.shape({ returnTo: PropTypes.string.isRequired }),
  signIn: PropTypes.func.isRequired,
  signOut: PropTypes.func.isRequired,
  signOutEverywhere: PropTypes.func.isRequired,
  refresh: PropTypes.func.isRequired,
  reload: PropTypes.func.isRequired,
  savePreferences: PropTypes.func.isRequired,
  readDeferredFavorites: PropTypes.func.isRequired,
});

/**
 * The session state every estate app renders through: the provider's
 * stored session on the first render and its loaded one after, its
 * claims, the favorites the user menu draws (read once per session
 * through `loadFavorites`, memoized like the claims, reset on sign-out and
 * on every reload, and never read while the current page is one of
 * `returnTo`'s auth paths, a provider's own pending-gate page included;
 * an adoption on such a page defers the read, and `readDeferredFavorites`
 * runs it once the app reports the page has left the auth paths),
 * the memberships in the chrome's organization shape,
 * the active organization resolved stored → primary → first and persisted
 * under the app's key, whether `load()` has confirmed the session, the
 * ended state with the page to return to, the sign-in and sign-out
 * handlers, and the push subscription kept in sync while signed in.
 *
 * @param {Object} options - The app's side
 * @param {Object} options.provider - A session provider such as `createBrowserOidc` or `createBackendSession`; a provider carrying `setNavigate(fn)` gets the router's `navigate` on every render, so a pending-gate refusal it sees outside `load` can still move the page in-router
 * @param {Object} options.events - The bus from `createSessionEvents`
 * @param {Object} options.returnTo - The helper from `createReturnTo`
 * @param {Function} options.navigate - The router's `navigate`, handed to the provider's `load`, `reload`, `refresh` and `begin`
 * @param {string} options.activeOrgKey - localStorage key of the active organization
 * @param {Object} [options.push] - The functions from `createPush`
 * @param {Function} [options.onAdopt] - Called with the session, or null, before it is rendered
 * @param {Function} [options.loadFavorites] - Answers `GET /api/user/favorites` for the signed-in person
 * @returns {Object} The session state and handlers
 */
export const useSession = ({
  provider,
  events,
  returnTo,
  navigate,
  activeOrgKey,
  push = null,
  onAdopt = null,
  loadFavorites = null,
}) => {
  const { t } = useTranslation();
  const notify = useNotify();
  const onAdoptRef = useRef(onAdopt);
  const navigateRef = useRef(navigate);
  const favoritesPromise = useRef(null);
  const favoritesDeferred = useRef(false);
  const [session, setSession] = useState(() => {
    const restored = provider.restore();
    if (onAdopt) {
      onAdopt(restored);
    }
    return restored || EMPTY;
  });
  const [claims, setClaims] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [activeOrgUuid, setActiveOrgUuid] = useState(() =>
    resolveActiveOrg(session.organizations, localStorage.getItem(activeOrgKey))
  );
  const [ended, setEnded] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    onAdoptRef.current = onAdopt;
    navigateRef.current = navigate;
    provider.setNavigate?.(navigate);
  });

  const persistActiveOrg = useCallback(
    uuid => {
      if (uuid) {
        localStorage.setItem(activeOrgKey, uuid);
      } else {
        localStorage.removeItem(activeOrgKey);
      }
    },
    [activeOrgKey]
  );

  const readFavorites = useCallback(() => {
    if (!loadFavorites) {
      return;
    }
    const pending = loadFavorites()
      .then(list => (Array.isArray(list) ? list : []))
      .catch(() => []);
    favoritesPromise.current = pending;
    pending.then(list => {
      if (favoritesPromise.current === pending) {
        favoritesDeferred.current = false;
        setFavorites(list);
      }
    });
  }, [loadFavorites]);

  const readDeferredFavorites = useCallback(() => {
    if (!favoritesDeferred.current || !session.user) {
      return;
    }
    favoritesDeferred.current = false;
    readFavorites();
  }, [readFavorites, session.user]);

  const adopt = useCallback(
    next => {
      const current = next || EMPTY;
      if (onAdoptRef.current) {
        onAdoptRef.current(next);
      }
      setSession(current);
      const resolved = resolveActiveOrg(current.organizations, localStorage.getItem(activeOrgKey));
      setActiveOrgUuid(resolved);
      persistActiveOrg(resolved);
      favoritesPromise.current = null;
      if (next) {
        setEnded(null);
        provider.claims().then(setClaims);
        if (returnTo.onAuthPage(window.location.pathname)) {
          favoritesDeferred.current = true;
        } else {
          readFavorites();
        }
      } else {
        favoritesDeferred.current = false;
        setClaims(null);
        setFavorites([]);
      }
    },
    [activeOrgKey, persistActiveOrg, provider, readFavorites, returnTo]
  );

  useEffect(() => {
    const offEnded = events.on('sessionEnded', detail => {
      adopt(null);
      setEnded({ returnTo: detail?.returnTo || '/' });
    });
    const offLogin = events.on('login', () =>
      provider.load({ navigate: navigateRef.current }).then(adopt)
    );
    const offLogout = events.on('logout', () => {
      provider.signOut();
      adopt(null);
    });
    provider.load({ navigate: navigateRef.current }).then(next => {
      adopt(next);
      setLoaded(true);
    });
    return () => {
      offEnded();
      offLogin();
      offLogout();
    };
  }, [adopt, events, provider]);

  useEffect(() => {
    if (!loaded || !session.user || !push || !push.isPushEnabled()) {
      return undefined;
    }
    const report = () => notify('danger', t('notifications.enableError'));
    push.syncSubscription().catch(report);
    return push.listenForSubscriptionChange(report);
  }, [loaded, notify, push, session.user, t]);

  const pickOrg = uuid => {
    if (!session.organizations.some(org => org.uuid === uuid)) {
      return;
    }
    setActiveOrgUuid(uuid);
    persistActiveOrg(uuid);
  };

  const signIn = () => {
    const onAuthPage = returnTo.onAuthPage(window.location.pathname);
    returnTo.remember(ended?.returnTo || (onAuthPage ? '' : currentPath()));
    setEnded(null);
    return provider.begin({ navigate: navigateRef.current });
  };

  const signOut = () => {
    provider.signOut();
    adopt(null);
  };

  const refresh = useCallback(
    () => provider.refresh({ navigate: navigateRef.current }).then(adopt),
    [adopt, provider]
  );

  const reload = useCallback(
    () => provider.reload({ navigate: navigateRef.current }).then(adopt),
    [adopt, provider]
  );

  return {
    ...session,
    claims,
    favorites,
    activeOrgUuid,
    loaded,
    pickOrg,
    sessionEnded: ended,
    signIn,
    signOut,
    signOutEverywhere: provider.signOutEverywhere,
    refresh,
    reload,
    savePreferences: provider.savePreferences,
    readDeferredFavorites,
  };
};
