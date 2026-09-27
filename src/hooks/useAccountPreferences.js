import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { isMotionPreference } from './useMotion';
import { isThemePreference } from './useTheme';

const ownTheme = () => {
  const value = localStorage.getItem('theme') || '';
  return isThemePreference(value) ? value : '';
};

const ownPack = () => localStorage.getItem('pack') || '';

const ownMotion = () => {
  const value = localStorage.getItem('motion');
  return isMotionPreference(value) ? value : 'auto';
};

/**
 * Apply the preferences an account carries every time its session loads,
 * the `preferred_theme`, `preferred_pack`, `preferred_motion` and
 * `preferred_language` members the backend, cookie and browser OIDC
 * providers answer beside the user: its theme, its look and its motion
 * switch in memory alone, never written into the browser's own keys, a
 * member the account holds as null meaning "follow this site" or the
 * device, and its language when it differs from the current one; a member
 * the session does not carry at all leaves the browser's own value. When
 * the user goes away, a sign-out or a session ended elsewhere, the theme,
 * the look and the motion switch return to the visitor's own values under
 * the browser's `theme`, `pack` and `motion` keys, the site's own and the
 * device's where a key is unset, so the account's look never spills into
 * the app's own while signed out and nothing of the visitor's is lost;
 * the language stays with i18n.
 *
 * @param {Object} options - The preferences
 * @param {Object|null} options.user - The session's user
 * @param {Function} options.setThemePreference - The setter from `useTheme`
 * @param {Function} options.setPackPreference - The look setter from `useTheme`
 * @param {Function} options.setMotionPreference - The setter from `useMotion`
 */
export const useAccountPreferences = ({
  user,
  setThemePreference,
  setPackPreference,
  setMotionPreference,
}) => {
  const { i18n } = useTranslation();
  const hadUser = useRef(false);
  const hasTheme = Boolean(user) && 'preferred_theme' in user;
  const preferredTheme = user?.preferred_theme || '';
  const preferredLanguage = user?.preferred_language || '';
  const hasPack = Boolean(user) && 'preferred_pack' in user;
  const preferredPack = user?.preferred_pack || '';
  const hasMotion = Boolean(user) && 'preferred_motion' in user;
  const preferredMotion = user?.preferred_motion || 'auto';

  useEffect(() => {
    if (hasTheme) {
      setThemePreference(preferredTheme, { persist: false });
    }
  }, [hasTheme, preferredTheme, setThemePreference]);

  useEffect(() => {
    if (hasPack) {
      setPackPreference(preferredPack, { persist: false });
    }
  }, [hasPack, preferredPack, setPackPreference]);

  useEffect(() => {
    if (hasMotion) {
      setMotionPreference(preferredMotion, { persist: false });
    }
  }, [hasMotion, preferredMotion, setMotionPreference]);

  useEffect(() => {
    if (preferredLanguage && preferredLanguage !== i18n.language) {
      i18n.changeLanguage(preferredLanguage);
    }
  }, [preferredLanguage, i18n]);

  useEffect(() => {
    if (user) {
      hadUser.current = true;
      return;
    }
    if (!hadUser.current) {
      return;
    }
    hadUser.current = false;
    setThemePreference(ownTheme(), { persist: false });
    setPackPreference(ownPack(), { persist: false });
    setMotionPreference(ownMotion(), { persist: false });
  }, [user, setThemePreference, setPackPreference, setMotionPreference]);
};
