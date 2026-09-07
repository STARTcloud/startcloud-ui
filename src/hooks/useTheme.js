import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';
const THEME_VALUES = ['auto', 'light', 'dark'];
const VARIANTS = ['light', 'dark'];
const NEXT_PREFERENCE = { auto: 'light', light: 'dark', dark: 'auto' };

const subscribeToColorScheme = onChange => {
  const query = window.matchMedia(DARK_SCHEME_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

const systemPrefersDark = () => window.matchMedia(DARK_SCHEME_QUERY).matches;

const siteDefault = () => {
  const value = document.documentElement.getAttribute('data-brand-theme');
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

/**
 * Theme state shared by every estate app, resolved in the order the
 * pre-paint script uses: the account preference handed in, else
 * localStorage.theme, else the site default the served page carries as
 * data-brand-theme, else auto against the operating system scheme. The
 * result is stamped on the document as data-bs-theme; a preference the
 * person or the account holds is mirrored to localStorage.theme, the site
 * default never is, and every user toggle is handed to onPersist so the
 * app can write it through to the account.
 */
export const useTheme = ({ initialPreference = '', onPersist = null } = {}) => {
  const [site] = useState(siteDefault);
  const [preference, setPreferenceState] = useState(() => {
    if (isThemePreference(initialPreference)) {
      return initialPreference;
    }
    return localStorage.getItem('theme') || (site ? '' : 'auto');
  });
  const prefersDark = useSyncExternalStore(subscribeToColorScheme, systemPrefersDark);
  const system = (prefersDark && 'dark') || 'light';
  const theme = resolveTheme({ preference, site, system });
  const shown = preference || 'auto';

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    if (preference) {
      localStorage.setItem('theme', preference);
    }
  }, [theme, preference]);

  const setPreference = useCallback(
    (next, { persist = true } = {}) => {
      if (!isThemePreference(next)) {
        return;
      }
      setPreferenceState(next);
      if (persist && onPersist) {
        onPersist(next);
      }
    },
    [onPersist]
  );

  const toggleTheme = useCallback(
    () => setPreference(NEXT_PREFERENCE[shown] || 'auto'),
    [shown, setPreference]
  );

  return { theme, preference: shown, setPreference, toggleTheme };
};
