const STORAGE_KEY = 'hosts_prefs';

export const HOST_PREF_DEFAULTS = {
  defaultDomain: '',
};

const listeners = new Set();

/**
 * The hosts preferences held to their shape: the default domain for new
 * machines trimmed, empty while none is set.
 *
 * @param {Object} prefs - The preferences as the card holds them
 * @returns {{ defaultDomain: string }} The preferences
 */
export const boundHostPrefs = prefs => ({
  defaultDomain: String(prefs.defaultDomain || '').trim(),
});

/**
 * The person's hosts preferences, the one object under `hosts_prefs`
 * over the defaults, the defaults alone while nothing is stored or the
 * stored value cannot be read.
 *
 * @returns {{ defaultDomain: string }} The preferences
 */
export const loadHostPrefs = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return boundHostPrefs({
      ...HOST_PREF_DEFAULTS,
      ...(saved && typeof saved === 'object' ? saved : {}),
    });
  } catch {
    return { ...HOST_PREF_DEFAULTS };
  }
};

const announce = () => listeners.forEach(listener => listener());

/**
 * Store the preferences, held to their shape, under `hosts_prefs` and
 * tell every open reader, so a save applies at once.
 *
 * @param {Object} prefs - The preferences as the card holds them
 * @returns {{ defaultDomain: string }} The preferences stored
 */
export const saveHostPrefs = prefs => {
  const clean = boundHostPrefs({ ...HOST_PREF_DEFAULTS, ...prefs });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  announce();
  return clean;
};

/**
 * Hear every save of the preferences for as long as the answered
 * function has not been called.
 *
 * @param {Function} listener - Called after every save
 * @returns {Function} Stops listening
 */
export const onHostPrefs = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
