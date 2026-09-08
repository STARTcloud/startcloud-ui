import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';
const THEME_VALUES = ['auto', 'light', 'dark'];
const VARIANTS = ['light', 'dark'];
const NEXT_PREFERENCE = { auto: 'light', light: 'dark', dark: 'auto' };

const store = { preference: null, site: '', onPersist: null, listeners: new Set() };

const subscribeToColorScheme = onChange => {
  const query = window.matchMedia(DARK_SCHEME_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

const systemPrefersDark = () => window.matchMedia(DARK_SCHEME_QUERY).matches;

const siteDefault = siteTheme => {
  const value = document.documentElement.getAttribute('data-brand-theme') || siteTheme;
  return VARIANTS.includes(value) ? value : '';
};

const resolveTheme = ({ preference, site, system }) => {
  if (preference === '') {
    return site;
  }
  if (preference === 'auto') {
    return system;
  }
  return preference;
};

export const isThemePreference = value => THEME_VALUES.includes(value);

const initStore = ({ initialPreference, siteTheme, onPersist }) => {
  if (store.preference === null) {
    store.site = siteDefault(siteTheme);
    store.preference = isThemePreference(initialPreference)
      ? initialPreference
      : localStorage.getItem('theme') || (store.site ? '' : 'auto');
  }
  if (onPersist) {
    store.onPersist = onPersist;
  }
  return store.preference;
};

const subscribePreference = listener => {
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
};

const readPreference = () => store.preference;

const writePreference = next => {
  store.preference = next;
  store.listeners.forEach(listener => listener());
};

/**
 * Theme state shared by every estate app, one store behind every call so
 * the header's button and the profile's Preferences tab read and write the
 * same preference, resolved in the order the pre-paint script uses: the
 * account preference handed in, else localStorage.theme, else the site
 * default the served page carries as data-brand-theme, or as `brand.theme`
 * of `/api/status` handed in as siteTheme when the served page carries no
 * attribute, else auto against the operating system scheme. The result is
 * stamped on the document as data-bs-theme; a preference the person or the
 * account holds is mirrored to localStorage.theme, the site default never
 * is, and every user toggle is handed to onPersist so the app can write it
 * through to the account.
 */
export const useTheme = ({ initialPreference = '', siteTheme = '', onPersist = null } = {}) => {
  useState(() => initStore({ initialPreference, siteTheme, onPersist }));
  const preference = useSyncExternalStore(subscribePreference, readPreference);
  const prefersDark = useSyncExternalStore(subscribeToColorScheme, systemPrefersDark);
  const system = (prefersDark && 'dark') || 'light';
  const theme = resolveTheme({ preference, site: store.site, system });
  const shown = preference || 'auto';

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    if (preference) {
      localStorage.setItem('theme', preference);
    }
  }, [theme, preference]);

  const setPreference = useCallback((next, { persist = true } = {}) => {
    if (!isThemePreference(next)) {
      return;
    }
    writePreference(next);
    if (persist && store.onPersist) {
      store.onPersist(next);
    }
  }, []);

  const toggleTheme = useCallback(
    () => setPreference(NEXT_PREFERENCE[shown] || 'auto'),
    [shown, setPreference]
  );

  return { theme, preference: shown, setPreference, toggleTheme };
};
