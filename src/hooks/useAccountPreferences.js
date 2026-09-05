import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Apply the preferences a backend profile carries once it loads: its theme
 * without writing it back, and its language when it differs from the
 * current one.
 *
 * @param {Object} options - The preferences
 * @param {Object|null} options.user - The session's user
 * @param {Function} options.setThemePreference - The setter from `useTheme`
 */
export const useAccountPreferences = ({ user, setThemePreference }) => {
  const { i18n } = useTranslation();
  const preferredTheme = user?.preferredTheme || '';
  const preferredLanguage = user?.preferredLanguage || '';

  useEffect(() => {
    if (preferredTheme) {
      setThemePreference(preferredTheme, { persist: false });
    }
  }, [preferredTheme, setThemePreference]);

  useEffect(() => {
    if (preferredLanguage && preferredLanguage !== i18n.language) {
      i18n.changeLanguage(preferredLanguage);
    }
  }, [preferredLanguage, i18n]);
};
