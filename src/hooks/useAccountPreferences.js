import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { isMotionPreference } from './useMotion';
import { isModePreference } from './useTheme';

const ownMode = () => {
  const value = localStorage.getItem('mode');
  return isModePreference(value) ? value : 'auto';
};

const ownTheme = () => localStorage.getItem('theme') || '';

const ownMotion = () => {
  const value = localStorage.getItem('motion');
  return isMotionPreference(value) ? value : 'auto';
};

/**
 * Apply the preferences an account carries every time its session loads,
 * the `preferred_mode`, `preferred_theme`, `preferred_motion` and
 * `preferred_language` members the backend, cookie and browser OIDC
 * providers answer beside the user: its mode, its theme and its motion
 * switch in memory alone, never written into the browser's own keys, a
 * mode the account holds as null meaning the operating system's, a theme
 * it holds as null meaning the host's own, a motion it holds as null the
 * device's, and its language when it differs from the current one; a
 * member the session does not carry at all leaves the browser's own
 * value. When the user goes away, a sign-out or a session ended
 * elsewhere, the mode, the theme and the motion switch return to the
 * visitor's own values under the browser's `mode`, `theme` and `motion`
 * keys, the operating system's, the host's own and the device's where a
 * key is unset, so the account's choices never spill into the app's own
 * while signed out and nothing of the visitor's is lost; the language
 * stays with i18n.
 *
 * @param {Object} options - The preferences
 * @param {Object|null} options.user - The session's user
 * @param {Function} options.setModePreference - The mode setter from `useTheme`
 * @param {Function} options.setThemePreference - The theme setter from `useTheme`
 * @param {Function} options.setMotionPreference - The setter from `useMotion`
 */
export const useAccountPreferences = ({
  user,
  setModePreference,
  setThemePreference,
  setMotionPreference,
}) => {
  const { i18n } = useTranslation();
  const hadUser = useRef(false);
  const hasMode = Boolean(user) && 'preferred_mode' in user;
  const preferredMode = user?.preferred_mode || 'auto';
  const preferredLanguage = user?.preferred_language || '';
  const hasTheme = Boolean(user) && 'preferred_theme' in user;
  const preferredTheme = user?.preferred_theme || '';
  const hasMotion = Boolean(user) && 'preferred_motion' in user;
  const preferredMotion = user?.preferred_motion || 'auto';

  useEffect(() => {
    if (hasMode) {
      setModePreference(preferredMode, { persist: false });
    }
  }, [hasMode, preferredMode, setModePreference]);

  useEffect(() => {
    if (hasTheme) {
      setThemePreference(preferredTheme, { persist: false });
    }
  }, [hasTheme, preferredTheme, setThemePreference]);

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
    setModePreference(ownMode(), { persist: false });
    setThemePreference(ownTheme(), { persist: false });
    setMotionPreference(ownMotion(), { persist: false });
  }, [user, setModePreference, setThemePreference, setMotionPreference]);
};
