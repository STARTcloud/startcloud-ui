import { useSyncExternalStore } from 'react';

const WATCHED = ['data-bs-theme', 'data-brand', 'data-motion'];

const store = {
  revision: 0,
  observer: null,
  listeners: new Set(),
};

const move = () => {
  store.revision += 1;
  store.listeners.forEach(listener => listener());
};

const start = () => {
  store.observer = new MutationObserver(move);
  store.observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: WATCHED,
  });
  document.head.addEventListener('load', move, true);
};

const stop = () => {
  store.observer.disconnect();
  store.observer = null;
  document.head.removeEventListener('load', move, true);
};

const subscribe = listener => {
  if (store.listeners.size === 0) {
    start();
  }
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
    if (store.listeners.size === 0) {
      stop();
    }
  };
};

const read = () => store.revision;

/**
 * A number that moves whenever what the page is painted in moved: the
 * mode, the theme or the motion switch stamped on the document
 * (`data-bs-theme`, `data-brand`, `data-motion`), and a stylesheet of the
 * head finishing its load, the theme's own among them. A surface that
 * reads the theme's tokens into something the stylesheet cannot reach, a
 * canvas, reads them again when the number moves; the change is heard
 * through a `MutationObserver` and the `load` event, never asked for on
 * a clock.
 *
 * @returns {number} The revision
 */
export const useThemeRevision = () => useSyncExternalStore(subscribe, read);
