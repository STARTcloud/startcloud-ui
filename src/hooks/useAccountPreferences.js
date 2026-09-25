import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Apply the preferences a backend profile carries once it loads: its theme
 * and its look without writing them back, and its language when it
 * differs from the current one.
 *
 * @param {Object} options - The preferences
 * @param {Object|null} options.user - The session's user
 * @param {Function} options.setThemePreference - The setter from `useTheme`
 * @param {Function} options.setPackPreference - The look setter from `useTheme`
 */
export const useAccountPreferences = ({ user, setThemePreference, setPackPreference }) => {
  const { i18n } = useTranslation();
  const preferredTheme = user?.preferred_theme || '';
  const preferredLanguage = user?.preferred_language || '';
  const hasPack = Boolean(user) && 'preferred_pack' in user;
  const preferredPack = user?.preferred_pack || '';

  useEffect(() => {
    if (preferredTheme) {
      setThemePreference(preferredTheme, { persist: false });
    }
  }, [preferredTheme, setThemePreference]);

  useEffect(() => {
    if (hasPack) {
      setPackPreference(preferredPack, { persist: false });
    }
  }, [hasPack, preferredPack, setPackPreference]);

  useEffect(() => {
    if (preferredLanguage && preferredLanguage !== i18n.language) {
      i18n.changeLanguage(preferredLanguage);
    }
  }, [preferredLanguage, i18n]);
};
