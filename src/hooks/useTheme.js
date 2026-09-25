import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { applyPack } from '../lib/runtime';

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';
const THEME_VALUES = ['auto', 'light', 'dark'];
const VARIANTS = ['light', 'dark'];
const NEXT_PREFERENCE = { auto: 'light', light: 'dark', dark: 'auto' };
const PACK_KEY = 'pack';

const store = {
  preference: null,
  site: '',
  onPersist: null,
  pack: '',
  preview: null,
  packs: [],
  sitePack: null,
  onPersistPack: null,
  listeners: new Set(),
};

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

const offered = name => store.packs.some(pack => pack.name === name);

const packOf = name => store.packs.find(pack => pack.name === name) || null;

const resolvePack = () => {
  if (store.preview !== null) {
    return store.preview;
  }
  return store.pack;
};

const initStore = ({ siteTheme, sitePack, packs, onPersist, onPersistPack }) => {
  if (store.preference === null) {
    store.site = siteDefault(siteTheme);
    store.preference = localStorage.getItem('theme') || (store.site ? '' : 'auto');
    store.packs = packs;
    store.sitePack = sitePack;
    const cached = localStorage.getItem(PACK_KEY) || '';
    store.pack = offered(cached) ? cached : '';
  }
  if (onPersist) {
    store.onPersist = onPersist;
  }
  if (onPersistPack) {
    store.onPersistPack = onPersistPack;
  }
  return store.preference;
};

const subscribePreference = listener => {
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
};

const notify = () => store.listeners.forEach(listener => listener());

const readPreference = () => store.preference;

const readPack = () => store.pack;

const readShownPack = () => resolvePack();

const writePreference = next => {
  store.preference = next;
  notify();
};

const writePack = next => {
  store.pack = next;
  notify();
};

const writePreview = next => {
  store.preview = next;
  notify();
};

/**
 * Theme state shared by every estate app, one store behind every call so
 * the header's control and the profile's Preferences tab read and write
 * the same preferences, resolved in the order the pre-paint script uses.
 * The variant: localStorage.theme, else the site default the served page
 * carries as data-brand-theme, or as `brand.theme` of `/api/status` handed
 * in as siteTheme when the served page carries no attribute, else auto
 * against the operating system scheme; the account value arrives through
 * setPreference once the profile loads and overwrites the store. The
 * result is stamped on the document as data-bs-theme; a preference the
 * person or the account holds is mirrored to localStorage.theme, the site
 * default never is, and every user toggle is handed to onPersist so the
 * app can write it through to the account. The look, the pack: the
 * person's choice under localStorage.pack while it names one of the packs
 * the host offers (`brand.packs`, handed in as packs), else the host's own
 * pack (`brand.pack`, handed in as sitePack), else none; the chosen pack
 * is painted through `applyPack`, a choice is mirrored to
 * localStorage.pack (an empty choice removes the key) and handed to
 * onPersistPack, and previewPack paints a pack transiently until
 * endPreview without touching the choice.
 */
export const useTheme = ({
  siteTheme = '',
  sitePack = null,
  packs = [],
  onPersist = null,
  onPersistPack = null,
} = {}) => {
  useState(() => initStore({ siteTheme, sitePack, packs, onPersist, onPersistPack }));
  const preference = useSyncExternalStore(subscribePreference, readPreference);
  const pack = useSyncExternalStore(subscribePreference, readPack);
  const shownPack = useSyncExternalStore(subscribePreference, readShownPack);
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

  useEffect(() => {
    applyPack(packOf(shownPack) || store.sitePack);
  }, [shownPack]);

  useEffect(() => {
    if (pack) {
      localStorage.setItem(PACK_KEY, pack);
    } else {
      localStorage.removeItem(PACK_KEY);
    }
  }, [pack]);

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

  const setPack = useCallback((next, { persist = true } = {}) => {
    if (next && !offered(next)) {
      return;
    }
    writePack(next || '');
    if (persist && store.onPersistPack) {
      store.onPersistPack(next || '');
    }
  }, []);

  const previewPack = useCallback(next => {
    writePreview(offered(next) ? next : '');
  }, []);

  const endPreview = useCallback(() => {
    if (store.preview !== null) {
      writePreview(null);
    }
  }, []);

  return {
    theme,
    preference: shown,
    setPreference,
    toggleTheme,
    pack,
    packs: store.packs,
    setPack,
    previewPack,
    endPreview,
  };
};
