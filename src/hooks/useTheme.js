import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { applyTheme } from '../lib/runtime';

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';
const MODE_VALUES = ['auto', 'light', 'dark'];
const NEXT_MODE = { auto: 'light', light: 'dark', dark: 'auto' };
const MODE_KEY = 'mode';
const THEME_KEY = 'theme';

const store = {
  mode: null,
  onPersistMode: null,
  theme: '',
  themes: [],
  hostTheme: null,
  onPersistTheme: null,
  listeners: new Set(),
};

const subscribeToColorScheme = onChange => {
  const query = window.matchMedia(DARK_SCHEME_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

const systemPrefersDark = () => window.matchMedia(DARK_SCHEME_QUERY).matches;

export const isModePreference = value => MODE_VALUES.includes(value);

const offered = name => store.themes.some(theme => theme.name === name);

const themeOf = name => store.themes.find(theme => theme.name === name) || null;

const writeOwn = (key, value) => {
  if (value) {
    localStorage.setItem(key, value);
  } else {
    localStorage.removeItem(key);
  }
};

const initStore = ({ hostTheme, themes, onPersistMode, onPersistTheme }) => {
  if (store.mode === null) {
    const cachedMode = localStorage.getItem(MODE_KEY);
    store.mode = isModePreference(cachedMode) ? cachedMode : 'auto';
    store.themes = themes;
    store.hostTheme = hostTheme;
    const cachedTheme = localStorage.getItem(THEME_KEY) || '';
    store.theme = offered(cachedTheme) ? cachedTheme : '';
  }
  if (onPersistMode) {
    store.onPersistMode = onPersistMode;
  }
  if (onPersistTheme) {
    store.onPersistTheme = onPersistTheme;
  }
  return store.mode;
};

const subscribe = listener => {
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
};

const notify = () => store.listeners.forEach(listener => listener());

const readMode = () => store.mode;

const readTheme = () => store.theme;

const writeMode = next => {
  store.mode = next;
  notify();
};

const writeTheme = next => {
  store.theme = next;
  notify();
};

/**
 * The theme and the mode shared by every estate app, one store behind
 * every call so the header's control and the profile's Preferences tab
 * read and write the same preferences, resolved in the order the
 * pre-paint script uses. The theme is a pack, the pack's files, fonts,
 * images and brands; the mode is `light`, `dark` or the operating
 * system's, `auto`. The store holds the values in force; the browser's
 * own keys, localStorage.mode and localStorage.theme, hold the visitor's
 * own choices, written by the person's own controls alone, `persist`
 * true, and never from an account, whose values arrive through setMode
 * and setTheme with `persist` false once the profile loads and overwrite
 * the store without touching the keys, so the account's choices never
 * spill into the visitor's own. The mode: localStorage.mode while it
 * holds `light`, `dark` or `auto`, else `auto`, the operating system's
 * scheme; a host names no mode and there is no site default. `auto` is
 * resolved against the operating system's scheme and the result is
 * stamped on the document as data-bs-theme; the header's control cycles
 * auto, light, dark and back to auto; a person's own choice is written
 * to localStorage.mode and handed to onPersistMode so the app writes it
 * through to the account. The theme: the person's choice under
 * localStorage.theme while it names one of the themes the host offers
 * (`brand.themes`, handed in as themes, the host's own list or every
 * theme of the build when the host names none), else the host's own
 * theme (`brand.theme`, handed in as hostTheme, the default `startcloud`
 * when the host names none); a name the host does not offer is the
 * host's own theme; the theme in force is painted through `applyTheme`,
 * a person's own choice is written to localStorage.theme (an empty
 * choice removes the key) and handed to onPersistTheme, and the choice
 * is made on the profile's Preferences page alone, the header's control
 * cycling the mode and never the theme.
 */
export const useTheme = ({
  hostTheme = null,
  themes = [],
  onPersistMode = null,
  onPersistTheme = null,
} = {}) => {
  useState(() => initStore({ hostTheme, themes, onPersistMode, onPersistTheme }));
  const mode = useSyncExternalStore(subscribe, readMode);
  const theme = useSyncExternalStore(subscribe, readTheme);
  const prefersDark = useSyncExternalStore(subscribeToColorScheme, systemPrefersDark);
  const system = (prefersDark && 'dark') || 'light';
  const resolved = mode === 'auto' ? system : mode;

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', resolved);
  }, [resolved]);

  useEffect(() => {
    applyTheme(themeOf(theme) || store.hostTheme);
  }, [theme]);

  const setMode = useCallback((value, { persist = true } = {}) => {
    if (!isModePreference(value)) {
      return;
    }
    writeMode(value);
    if (!persist) {
      return;
    }
    writeOwn(MODE_KEY, value);
    if (store.onPersistMode) {
      store.onPersistMode(value);
    }
  }, []);

  const toggleMode = useCallback(() => setMode(NEXT_MODE[mode] || 'auto'), [mode, setMode]);

  const setTheme = useCallback((next, { persist = true } = {}) => {
    const value = next && offered(next) ? next : '';
    writeTheme(value);
    if (!persist) {
      return;
    }
    writeOwn(THEME_KEY, value);
    if (store.onPersistTheme) {
      store.onPersistTheme(value);
    }
  }, []);

  return {
    mode,
    resolved,
    setMode,
    toggleMode,
    theme,
    themes: store.themes,
    setTheme,
  };
};
