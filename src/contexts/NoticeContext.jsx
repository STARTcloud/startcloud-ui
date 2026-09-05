import PropTypes from 'prop-types';
import { createContext, useContext, useMemo, useState, useSyncExternalStore } from 'react';

const CARD_CAP = 4;

export const NoticeContext = createContext(null);

const createNoticeStore = () => {
  let notices = [];
  let nextId = 0;
  const listeners = new Set();

  const set = next => {
    notices = next;
    listeners.forEach(listener => listener());
  };

  const drop = keep => {
    const next = notices.filter(keep);
    if (next.length !== notices.length) {
      set(next);
    }
  };

  const add = notice => {
    nextId += 1;
    const entry = { ...notice, id: nextId };
    const kept = notice.key ? notices.filter(other => other.key !== notice.key) : notices;
    const next = [entry, ...kept];
    const overflow = next.filter(other => other.tier === 'card').slice(CARD_CAP);
    set(overflow.length > 0 ? next.filter(other => !overflow.includes(other)) : next);
    return entry.id;
  };

  return {
    get: () => notices,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    add,
    remove: id => drop(notice => notice.id !== id),
    removeKey: key => drop(notice => notice.key !== key),
  };
};

const createNotifier =
  store =>
  (kind, text, options = {}) => {
    const { tier = 'card', key = '', sticky = false, action = null } = options;
    if (!text) {
      if (key) {
        store.removeKey(key);
      }
      return 0;
    }
    return store.add({ kind, text, tier, key, sticky, action });
  };

/**
 * Holds the notices every estate app raises, outside the routes so they
 * survive route changes and page crashes; the app provider renders it
 * inside the outer error boundary.
 */
export const NoticeProvider = ({ children }) => {
  const [store] = useState(createNoticeStore);
  const value = useMemo(
    () => ({ store, notify: createNotifier(store), dismiss: store.remove }),
    [store]
  );
  return <NoticeContext.Provider value={value}>{children}</NoticeContext.Provider>;
};

NoticeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * The one way pages and slots raise an in-app notice: `notify(kind, text,
 * options)` with kind `success`, `info`, `warning` or `danger`, a card unless
 * `options.tier` is `banner`; `options.key` replaces an earlier notice with
 * the same key and, with an empty `text`, dismisses it; `options.sticky`
 * keeps a success or info card until it is dismissed; `options.action` is
 * `{ label, onClick | to | href }`. Returns the notice id.
 *
 * @returns {Function} The app's `notify`
 */
export const useNotify = () => useContext(NoticeContext).notify;

/**
 * Dismisses one notice by the id `notify` returned.
 *
 * @returns {Function} `dismiss(id)`
 */
export const useDismiss = () => useContext(NoticeContext).dismiss;

/**
 * The live list of notices, newest first, for the banners and cards to draw.
 *
 * @returns {Array<Object>} The notices
 */
export const useNoticeList = () => {
  const { store } = useContext(NoticeContext);
  return useSyncExternalStore(store.subscribe, store.get);
};
